export interface AlertInput {
    start: Date;
    end: Date;
    type?: {name: string, color: AlertColorInput};
    title: string;
    content: string;
    dismissable: boolean;
}

interface ColorInput {
    name?: string;
    r: number;
    g: number;
    b: number;
    alpha: number;
}

interface AlertAppearanceColorInput extends ColorInput {
    appearance: string;
}

export interface AlertColorInput extends ColorInput {
    appearances: AlertAppearanceColorInput[];
}