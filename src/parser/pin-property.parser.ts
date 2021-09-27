import { StructClass } from "../controls/utils/color-utils";
import { ColorBoxControl } from "../controls/color-box.control";
import { Color } from "../data/color";
import { PinCategory } from "../data/pin/pin-category";
import { PinContainerType } from "../data/pin/pin-container-type";
import { PinDirection } from "../data/pin/pin-direction";
import { PinLink } from "../data/pin/pin-link";
import { PinProperty } from "../data/pin/pin-property";
import { removeInsignificantTrailingZeros, prettifyText } from "../utils/text-utils";
import { BlueprintParserUtils } from "./blueprint-parser-utils";
import { CustomPropertyParser } from "./custom-property.parser";
import { StructBoxControl } from "../controls/struct-box.control";
import { TextBoxControl } from "../controls/text-box.control";
import { CheckBoxControl } from "../controls/check-box.control";
import { PinSubCategoryObject } from "../data/pin/pin-subcategory-object";

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
        "PinType.bIsReference": (p: PinProperty, value: string) => { p.isReference = value.toLowerCase() === "true"; },
        "PinType.bIsConst": (p: PinProperty, value: string) => { p.isConst = value.toLowerCase() === "true"; },
        "PinType.bIsWeakPointer": (p: PinProperty, value: string) => { p.isWeakPointer = value.toLowerCase() === "true"; },
        "PinType.bIsUObjectWrapper": (p: PinProperty, value: string) => { p.isUObjectWrapper = value.toLowerCase() === "true"; },
        "DefaultValue": (p: PinProperty, value: string) => {
            const res = this.parseDefaultValue(p, value);
            p.defaultValue = res.data;
            p.defaultValueControlClass = res.control;
        },
        "DefaultObject": (p: PinProperty, value: string) => {
            const defaultObject = BlueprintParserUtils.parseString(value);
            const className = BlueprintParserUtils.getClassFriendlyName(defaultObject);
            if (!!className) {
                p.defaultValue = className;
                p.defaultValueControlClass = TextBoxControl;
            }
        },
        "DefaultTextValue": (p: PinProperty, value: string) => {
            p.defaultValue = this.parseDefaultValueText(value);
            p.defaultValueControlClass = TextBoxControl;
        },
        "AutogeneratedDefaultValue": (p: PinProperty, value: string) => { p.autogeneratedDefaultValue = BlueprintParserUtils.parseString(value); },
        "LinkedTo": (p: PinProperty, value: string) => {  p.linkedTo = PinPropertyParser.parseLinkedTo(value); },
        "bHidden": (p: PinProperty, value: string) => { p.hidden = (value.toLowerCase() === "true"); },
        "bDefaultValueIsIgnored": (p: PinProperty, value: string) => { p.defaultValueIsIgnored = (value.toLowerCase() === "true"); },
        "bDefaultValueIsReadOnly": (p: PinProperty, value: string) => { p.defaultValueIsReadOnly = (value.toLowerCase() === "true"); },
        "bAdvancedView": (p: PinProperty, value: string) => { p.advancedView = (value.toLowerCase() === "true"); },
        "bOrphanedPin": (p: PinProperty, value: string) => { p.orphanedPin = (value.toLowerCase() === "true"); },
        "bNotConnectable": (p: PinProperty, value: string) => { p.notConnectable = (value.toLowerCase() === "true"); },
        "PersistentGuid": (p: PinProperty, value: string) => { p.persistentGUID = BlueprintParserUtils.parseString(value); },
        "PinType.ContainerType": (p: PinProperty, value: string) => { p.containerType = value as PinContainerType; },
        "PinType.PinValueType": (p: PinProperty, value: string) => {
            value = value.replace(/[\(\)]/g, '');
            value = value.split('=')[1];
            if (value !== undefined) {
                p.valueType = value.replace(/"/g, '');
            }
        },
        "PinType.PinSubCategoryMemberReference": (p: PinProperty, value: string) => {
            // if(value && value != '()') {
            //     console.log(`Found interesting attribute 'PinType.PinSubCategoryMemberReference' for which a value other than '()' was set. PinType.PinSubCategoryMemberReference='${value}' [pin-name: ${p.name}]`);
            // }
        },
    }

    parse(propertyData: string, nodeName: string): PinProperty {
        
        this._property = new PinProperty(nodeName);

        // ([a-zA-Z0-9_.]+)                     Capture key (similar to \w, but also allows dots)
        // \s*=\s*                              Equal sign between optional white spaces
        // (("[^"]*")|(\([^\)]*\))|([^,]*))     Captures a value implemented in one of 4 types
        //      ("[^"]*")                         Type 1: capture quoted values            e.g.: PinName="self"
        //      (\([^\)]*\))                      Type 2: capture values set in brackets   e.g.: LinkedTo=(K2Node_CallFunction_0 6A3D6AD94697B8938F5061A6BA9D5FF2,)
        //      (\w*\(\w*(?:[^\(]*\([^\)]*\))*\)) Type 3: capture multilevel loctext       e.g.: PinFriendlyName=LOCGEN_FORMAT_NAMED(NSLOCTEXT("KismetSchema", "SplitPinFriendlyNameFormat", "{PinDisplayName} {ProtoPinDisplayName}"), "PinDisplayName", NSLOCTEXT("", "E767B2BA4B1D5DFDD5E21E953300AB1E", "Settings"), "ProtoPinDisplayName", NSLOCTEXT("", "182F932842DA4BEA8624D89F6CD70FDA", "Attenuation Settings"))
        //      (\w*\([^\)]*\))                   Type 4: capture method values            e.g.: PinFriendlyName=NSLOCTEXT("K2Node", "Target", "Target")
        //      ([^,]*)                           Type 5: capture pure values              e.g.: PinType.bIsConst=False
        const matches = propertyData.matchAll(/([a-zA-Z0-9_.]+)\s*=\s*(("[^"]*")|(\([^)]*\))|(\w*\(\w*(?:[^(]*\([^)]*(?:"[^"]*")\))*\))|(\w*\([^)]*\([^)]*\)[^)]*\))|(\w*\([^)]*\))|([^,]*))/g);

        for (const [fullMatch, key, value] of matches) {
            if(!fullMatch || !key) { console.warn(`Skipped property attribute because invalid key: '${fullMatch}'`); continue; }
            const parse = PinPropertyParser._ATTRIBUTE_PARSERS[key];
            if(!parse) {
                console.info(`Didn't parse property attribute '${key}'. There isn't a matching parser.`);
                continue;
            }
            parse(this._property, value);
        }

        PinPropertyParser.setDefaultValueIfUndefined(this._property);

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


    private static parseSubCategoryObject(value: string): PinSubCategoryObject {
        let className = value;
        let type = value.substring(0, value.indexOf("'"));
        let matches = value.matchAll(/'"(.*)"'/g);
        if (matches) {
            let match = matches.next();

            if (match && match.value) {
                className = match.value[1];
            }
        }

        return { type: type, class: className };
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


        if (value.startsWith("LOCGEN_FORMAT_NAMED")) {
            // The following format is displayed all on one line
            //  LOCGEN_FORMAT_NAMED(
            //      NSLOCTEXT(
            //          "KismetSchema",
            //          "SplitPinFriendlyNameFormat",
            //          "{PinDisplayName} {ProtoPinDisplayName}"
            //      ),
            //      "PinDisplayName",
            //      NSLOCTEXT(
            //          "",
            //          "5808C87D488AE450C56BB49263E71071",
            //          "Settings"
            //      ),
            //      "ProtoPinDisplayName",
            //      NSLOCTEXT(
            //          "",
            //          "6FA6CBF1411267BBB10EB39B727DF7C7",
            //          "Component To Attach To"
            //      )
            //  )

            let prefixLength = 'LOCGEN_FORMAT_NAMED('.length;
            value = value.substr(prefixLength, value.length - prefixLength - 1);

            let format = "";
            let args: { [key: string]: string } = {};

            let matches = value.matchAll(/(\w*\((?:"[^"]*"[, ]*)+\))|("[^"]*")/g);
            let lastValue = undefined;
            for (const [fullMatch, key, value] of matches) {
                let prop = fullMatch;
                prop = prop.trim();

                if (prop.startsWith("NSLOCTEXT")) {
                    prop = prop.substring("NSLOCTEXT(".length, prop.length - 1);
                    let data = prop.split(',');
                    let key = data[0].trim().replace(/"/g, '');
                    let id = data[1].trim().replace(/"/g, '');;
                    let value = data[2].trim().replace(/"/g, '');;

                    if (key === "KismetSchema") {
                        format = value;
                    }

                    if (key === "") {
                        key = lastValue;
                        args[key] = value;
                    }
                }

                let value = prop.replace(/"/g, '');
                lastValue = value;
            }

            let friendlyName = format;
            for (let key in args) {
                let value = args[key];

                friendlyName = friendlyName.replace("{"+key+"}", value);
            }

            return friendlyName;
        }

        name = value.replace(/"/g, '');

        return name;
    }

    private static parsePinCategory(value: string): PinCategory {
        value = BlueprintParserUtils.parseString(value);
        return value.toLowerCase() as PinCategory;
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


    private static parseDefaultValue(p: PinProperty, value: string): { data: any, control: any } {
        if (!value) { return; }

        switch (p.category) {
            case PinCategory.float:
                return { control: TextBoxControl, data: removeInsignificantTrailingZeros(BlueprintParserUtils.parseString(value)) };
            case PinCategory.bool:
                return { control: CheckBoxControl, data: (BlueprintParserUtils.parseString(value).toLowerCase() === "true") };
            case PinCategory.struct:
                return this.parseDefaultValueStruct(p.subCategoryObject.class, value);
            case PinCategory.byte:
                if (p.subCategoryObject.type === "Enum") {
                    return { control: TextBoxControl, data: BlueprintParserUtils.parseEnumValue(p.subCategoryObject.class, value) };
                } else {
                    return { control: TextBoxControl, data: BlueprintParserUtils.parseString(value) };
                }
            default:
                return { control: TextBoxControl, data: BlueprintParserUtils.parseString(value) };
        }
    }

    private static parseEnumValue() {
        
    }

    private static parseDefaultValueStruct(subCategoryObject: string, value: string): { data: any, control: any }  {
        switch (subCategoryObject) {
            case StructClass.VECTOR:
            case StructClass.ROTATOR:
                return { control: StructBoxControl, data: this.parseDefaultValueVector(value) };
            case StructClass.LINEAR_COLOR:
                const cParams = this.parseDefaultValueStructCommon(value).map(p => Number(p.value));
                const color = new Color(
                    (cParams[0] || 0) * 255,
                    (cParams[1] || 0) * 255,
                    (cParams[2] || 0) * 255,
                    cParams[3]);
                color.applyGamma();
                return { control: ColorBoxControl, data: color};
            default:
                return { control: StructBoxControl, data: this.parseDefaultValueStructCommon(value) };
        }
    }

    private static parseDefaultValueVector(value: string): Array<{ key: string, value: string }> {
        const LABELS = ['X', 'Y', 'Z'];

        let defaultValues = [];
        value.split(',').forEach(axis => {
            defaultValues.push(removeInsignificantTrailingZeros(BlueprintParserUtils.parseString(axis)));
        });

        for (let i = 0; i < defaultValues.length; i++) {
            defaultValues[i] = {
                key: LABELS[i],
                value: defaultValues[i]
            };
        }

        return defaultValues;
    }

    private static parseDefaultValueStructCommon(value: string): Array<{ key: string, value: string }> {
        let defaultValues = [];

        // Removes quotes
        value = BlueprintParserUtils.parseString(value);

        // Removes brackets
        value = value.trim().replace(/[()]/g, '');

        value.split(',').forEach(property => {
            const [key, value] = property.split('=');
            defaultValues.push({
                key,
                value: removeInsignificantTrailingZeros(value)
            });
        });

        return defaultValues;
    }

    private static parseDefaultValueText(value: string) {
        // This regex returns the content of the last string in quotes
        // INVTEXT("Hello")
        // NSLOCTEXT("[8C2B370E4196E0C88E4D18AC0E3BB4B4]", "08FBE3A046496681A158759F47A09610", "Hello")
        const matches = /(?<=")([^"]+)(?="\))/g.exec(value.trim());
        if(!matches) {
            return value;
        }
        return matches[0];
    }

    private static setDefaultValueIfUndefined(p: PinProperty) {
        if(p.defaultValue != undefined) { return }

        switch (p.category) {
            case PinCategory.bool:
                p.defaultValue = false;
                p.defaultValueControlClass = CheckBoxControl;
            case PinCategory.string:
                p.defaultValue = "  ";
                p.defaultValueControlClass = TextBoxControl;
            case PinCategory.struct:
                switch (p.subCategoryObject.class) {
                    case StructClass.VECTOR2D:
                        p.defaultValue = [
                            { key: 'X', value: '0.0' },
                            { key: 'Y', value: '0.0' }];
                        p.defaultValueControlClass = StructBoxControl;
                        break;
                }
                break;
        }
    }
}
