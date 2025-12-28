import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: ["dist/**", "node_modules/**", "playground/**", "*.config.*"],
	},
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-require-imports": "off",
			"no-useless-escape": "off",
			"no-control-regex": "off",
		},
	}
);
