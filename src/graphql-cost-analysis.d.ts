declare module 'graphql-cost-analysis' {
    import { ValidationContext } from 'graphql';

    export default function costAnalysis(options: { maximumCost: number }): (context: ValidationContext) => any;
}