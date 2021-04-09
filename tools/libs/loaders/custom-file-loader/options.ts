import { Schema } from "schema-utils/declarations/validate";

export default {
    type: "object",
        properties: {
        name: { },
        regExp: { },
        context: {
            type: "string",
        },
        publicPath: { },
        outputPath: { },
        useRelativePath: {
            type: "boolean",
        },
        emitFile: {
            type: "boolean",
        },
    },
    additionalProperties: true,
} as Schema;
