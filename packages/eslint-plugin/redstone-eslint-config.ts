import { ESLintUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";
import type { Type } from "typescript";
import type { FlatConfig } from "typescript-eslint";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://redstone.finance/eslint/rules/${name}`
);

const operatorsMap: Record<string, string> = {
  "<": ".lt()",
  "<=": ".lte()",
  ">": ".gt()",
  ">=": ".gte()",
  "==": ".eq()",
  "===": ".eq()",
  "!=": "!().eq())",
  "!==": "!(.eq())",
};
const suspiciousOperators = Object.keys(operatorsMap);

export const noDecimalComparison = createRule({
  create(context: TSESLint.RuleContext<"noDecimalCompare", unknown[]>) {
    return {
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (!suspiciousOperators.includes(node.operator)) {
          return;
        }

        const parserServices = context.sourceCode.parserServices;
        if (!parserServices?.program || !parserServices.esTreeNodeToTSNodeMap) {
          return;
        }
        const checker = parserServices.program.getTypeChecker();

        const leftTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.left);
        const rightTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.right);

        const leftType = checker.getTypeAtLocation(leftTsNode);
        const rightType = checker.getTypeAtLocation(rightTsNode);

        const isDecimal = (t: Type): boolean => {
          return t.getSymbol()?.getName() === "Decimal";
        };

        if (isDecimal(leftType) || isDecimal(rightType)) {
          context.report({
            node,
            messageId: "noDecimalCompare",
            data: { operator: node.operator, replacement: operatorsMap[node.operator] },
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Avoid relational operators with Decimal objects.",
    },
    messages: {
      noDecimalCompare:
        "Do not use operator {{operator}} with Decimal. Use wrapper method {{replacement}} instead",
    },
    type: "suggestion",
    schema: [],
  },
  name: "no-decimal-comparison",
  defaultOptions: [],
});

const redstonePlugin = {
  rules: {
    "no-decimal-comparison": noDecimalComparison,
  },
};

export const redstoneConfig: FlatConfig.Config[] = [
  {
    plugins: {
      redstonePlugin,
    },
    rules: {
      "redstonePlugin/no-decimal-comparison": "error",
    },
  },
];
