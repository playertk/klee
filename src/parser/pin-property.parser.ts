import { PinCategory } from "../data/pin/pin-category";
import { PinDirection } from "../data/pin/pin-direction";
import { PinLink } from "../data/pin/pin-link";
import { PinProperty } from "../data/pin/pin-property";
import { removeInsignificantTrailingZeros, prettifyText } from "../utils/text-utils";
import { BlueprintParserUtils } from "./blueprint-parser-utils";
import { CustomPropertyParser } from "./custom-property.parser";

export class PinPropertyParser implements CustomPropertyParser {

    private _property: PinProperty;

    private static readonly _ATTRIBUTE_PARSERS: {
        [key: string]: (p: PinProperty, value: string) => void
    } = {
        "PinId": (p: PinProperty, value: string) => { p.id = value; },
        "PinName": (p: PinProperty, value: string) => { p.name = prettifyText(BlueprintParserUtils.parseString(value)); },
        "PinFriendlyName": (p: PinProperty, value: string) => { p.friendlyName = prettifyText(PinPropertyParser.parsePinFriendlyName(value)); },
        "PinType.PinCategory": (p: PinProperty, value: string) => { p.category = PinPropertyParser.parsePinCategory(value); },
        "Direction": (p: PinProperty, value: string) => { p.direction = PinPropertyParser.parseDirection(value); },
        "PinToolTip": (p: PinProperty, value: string) => { p.toolTip = BlueprintParserUtils.parseString(value); },
        "PinType.PinSubCategory": (p: PinProperty, value: string) => { p.subCategory = BlueprintParserUtils.parseString(value); },
        "PinType.PinSubCategoryObject": (p: PinProperty, value: string) => { p.subCategoryObject = PinPropertyParser.parseSubCategoryObject(value); },
        "PinType.bIsReference": (p: PinProperty, value: string) => { p.isReference = value == "True"; },
        "PinType.bIsConst": (p: PinProperty, value: string) => { p.isConst = value == "True"; },
        "PinType.bIsWeakPointer": (p: PinProperty, value: string) => { p.isWeakPointer = value == "True"; },
        "PinType.bIsUObjectWrapper": (p: PinProperty, value: string) => { p.isUObjectWrapper = value == "True"; },
        "DefaultValue": (p: PinProperty, value: string) => { p.defaultValue = removeInsignificantTrailingZeros(BlueprintParserUtils.parseString(value)); },
        "DefaultObject": (p: PinProperty, value: string) => {
            const defaultObject = BlueprintParserUtils.parseString(value);
            const className = BlueprintParserUtils.getClassFriendlyName(defaultObject);
            if (!!className) {
                p.defaultValue = className;
            }
        },
        "AutogeneratedDefaultValue": (p: PinProperty, value: string) => { p.autogeneratedDefaultValue = BlueprintParserUtils.parseString(value); },
        "LinkedTo": (p: PinProperty, value: string) => {  p.linkedTo = PinPropertyParser.parseLinkedTo(value); },
        "bHidden": (p: PinProperty, value: string) => { p.hidden = (value === "True"); },
        "bDefaultValueIsIgnored": (p: PinProperty, value: string) => { p.defaultValueIsIgnored = (value === "True"); },
        "bDefaultValueIsReadOnly": (p: PinProperty, value: string) => { p.defaultValueIsReadOnly = (value === "True"); },
        "bAdvancedView": (p: PinProperty, value: string) => { p.advancedView = (value === "True"); },
        "bOrphanedPin": (p: PinProperty, value: string) => { p.orphanedPin = (value === "True"); },
        "bNotConnectable": (p: PinProperty, value: string) => { p.notConnectable = (value === "True"); },
        "PersistentGuid": (p: PinProperty, value: string) => { p.persistentGUID = BlueprintParserUtils.parseString(value); },
        "PinType.ContainerType": (p: PinProperty, value: string) => {
            if(value && value != 'None') {
                console.log(`Found interesting attribute 'PinType.ContainerType' for which a value other than 'None' was set. PinType.ContainerType='${value}' [pin-name: ${p.name}]`);
            }
        },
        "PinType.PinValueType": (p: PinProperty, value: string) => {
            if(value && value != '()') {
                console.log(`Found interesting attribute 'PinType.PinValueType' for which a value other than '()' was set. PinType.PinValueType='${value}' [pin-name: ${p.name}]`);
            }
        },
        "PinType.PinSubCategoryMemberReference": (p: PinProperty, value: string) => {
            if(value && value != '()') {
                console.log(`Found interesting attribute 'PinType.PinSubCategoryMemberReference' for which a value other than '()' was set. PinType.PinSubCategoryMemberReference='${value}' [pin-name: ${p.name}]`);
            }
        },
    }

    parse(propertyData: string, nodeName: string): PinProperty {

        this._property = new PinProperty(nodeName);
        //let data = propertyData.split(/,(?![^(]*\))/g);

        // ([a-zA-Z0-9_.]+)                     Capture key (similar to \w, but also allows dots)
        // \s*=\s*                              Equal sign between optional white spaces
        // (("[^"]*")|(\([^\)]*\))|([^,]*))     Captures a value implemented in one of 4 types
        //      ("[^"]*")                         Type 1: capture quoted values            z.B.: PinName="self"
        //      (\([^\)]*\))                      Type 2: capture values set in brackets   z.B.: LinkedTo=(K2Node_CallFunction_0 6A3D6AD94697B8938F5061A6BA9D5FF2,)
        //      (\w*\([^\)]*\))                   Type 3: capture method values            z.B.: PinFriendlyName=NSLOCTEXT("K2Node", "Target", "Target")
        //      ([^,]*)                           Type 4: capture pure values              z.B.: PinType.bIsConst=False
        const matches = propertyData.matchAll(/([a-zA-Z0-9_.]+)\s*=\s*(("[^"]*")|(\([^\)]*\))|(\w*\([^\)]*\))|([^,]*))/g);

        for (const [fullMatch, key, value] of matches) {
            if(!fullMatch || !key) { console.warn(`Skipped property attribute because invalid key: '${fullMatch}'`); continue; }
            const parse = PinPropertyParser._ATTRIBUTE_PARSERS[key];
            if(!parse) {
                console.info(`Didn't parse property attribute '${key}'. There isn't a matching parser.`);
                continue;
            }
            parse(this._property, value);
        }

        return this._property;
    }

    private static parseLinkedTo(value: string): PinLink[] {
        let links = [];
        value = value.substr(1, value.length - 1);

        let data = value.split(',')
        for (let i = 0; i < data.length; ++i) {
            let dataset = data[i].split(' ');
            if (dataset.length == 2) {
                let link = new PinLink();
                link.nodeName = dataset[0];
                link.pinID = dataset[1];

                links.push(link);
            }
        }

        return links;
    }


    private static parseSubCategoryObject(value: string): string {
        let obj = value;
        let matches = value.matchAll(/'"(.*)"'/g);
        if (matches) {
            let match = matches.next();

            if (match && match.value) {
                obj = match.value[1];
            }
        }

        return obj;
    }

    private static parsePinFriendlyName(value: string): string {
        let name:string = "";

        if (value.startsWith("NSLOCTEXT")) {
            let prefixLength = 'NSLOCTEXT('.length - 1;
            value = value.substr(prefixLength, value.length - prefixLength - 1);

            let params = value.split(',');
            name = params[params.length - 1].replace(/"/g, '');
            return name;
        }

        name = value.replace(/"/g, '');

        return name;
    }

    private static parsePinCategory(value: string): PinCategory {
        value = BlueprintParserUtils.parseString(value);
        switch (value) {
            case "exec": return PinCategory.exec;
            case "object": return PinCategory.object;
            case "int": return PinCategory.int;
            case "string": return PinCategory.string;
            case "float": return PinCategory.float;
            case "struct": return PinCategory.struct;
            case "class": return PinCategory.class;
            case "bool": return PinCategory.bool;
            case "delegate": return PinCategory.delegate;
            case "name": return PinCategory.name;
            case "wildcard": return PinCategory.wildcard;
            case "byte": return PinCategory.byte;
        }
    }

    private static parseDirection(value: string): PinDirection {
        value = value.replace(/"/g, '');

        switch (value) {
            case "EGPD_Output": return PinDirection.EGPD_Output;
            case "EGPD_Input":
            default:
                return PinDirection.EGPD_Input;
        }
    }
}
