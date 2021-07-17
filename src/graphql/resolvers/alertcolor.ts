import { IResolverObject } from "apollo-server-express";
import { Color } from "../../interfaces";
import Context from '../context';

const AlertColor: IResolverObject<any, Context> = {
    appearances(color: Color) {
        return color.appearances ? Object.keys(color.appearances).map(appearanceName => ({
            appearance: appearanceName,
            ...color.appearances![appearanceName]
        })) : [];
    },

    color(color: Color, { appearance }: { appearance: string }) {
        const resolved = color.appearances && color.appearances[appearance];
        if (resolved) {
            return { appearance, ...resolved };
        } else {
            return color;
        }
    }
};

export default AlertColor;