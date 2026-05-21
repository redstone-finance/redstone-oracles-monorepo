import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "./create-rule";

const REDUNDANT_VOID_MSG = "redundantVoid";
const REDUNDANT_PROMISE_VOID_MSG = "redundantPromiseVoid";

type MessageIds = typeof REDUNDANT_VOID_MSG | typeof REDUNDANT_PROMISE_VOID_MSG;

export default createRule<[], MessageIds>({
  name: "no-redundant-void-return",
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow redundant `: void` and `: Promise<void>` return type annotations",
    },
    fixable: "code",
    schema: [],
    messages: {
      redundantVoid: "Redundant `: void` return type — let TypeScript infer it.",
      redundantPromiseVoid: "Redundant `: Promise<void>` return type — let TypeScript infer it.",
    },
  },
  defaultOptions: [],

  create(context) {
    function check(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ) {
      const returnType = node.returnType;
      if (!returnType) {
        return;
      }

      const annotation = returnType.typeAnnotation;

      if (annotation.type === AST_NODE_TYPES.TSVoidKeyword) {
        context.report({
          node: returnType,
          messageId: REDUNDANT_VOID_MSG,
          fix: (fixer) => fixer.remove(returnType),
        });

        return;
      }

      if (node.async && isTypeReference(annotation) && isPromiseVoidTypeReference(annotation)) {
        context.report({
          node: returnType,
          messageId: REDUNDANT_PROMISE_VOID_MSG,
          fix: (fixer) => fixer.remove(returnType),
        });
      }
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});

type TSTypeReferenceWithLegacyTypeParameters = TSESTree.TSTypeReference & {
  typeParameters?: TSESTree.TSTypeParameterInstantiation;
};

function getTypeArguments(
  node: TSESTree.TSTypeReference
): TSESTree.TSTypeParameterInstantiation | undefined {
  const legacyNode = node as TSTypeReferenceWithLegacyTypeParameters;

  return legacyNode.typeArguments ?? legacyNode.typeParameters;
}

function isPromiseVoidTypeReference(node: TSESTree.TSTypeReference) {
  const typeArgs = getTypeArguments(node);
  const [typeArg] = typeArgs?.params ?? [];

  return (
    node.typeName.type === AST_NODE_TYPES.Identifier &&
    node.typeName.name === "Promise" &&
    typeArgs?.params.length === 1 &&
    typeArg.type === AST_NODE_TYPES.TSVoidKeyword
  );
}

function isTypeReference(node: TSESTree.TypeNode): node is TSESTree.TSTypeReference {
  return node.type === AST_NODE_TYPES.TSTypeReference;
}
