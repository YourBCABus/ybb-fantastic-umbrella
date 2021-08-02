declare module 'graphql-cost-analysis' {
    import { ValidationContext } from 'graphql';

    export default function costAnalysis(options: { maximumCost: number, variables: any }): (context: ValidationContext) => any;
}