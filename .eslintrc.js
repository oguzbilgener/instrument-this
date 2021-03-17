module.exports = {
    "parser": "babel-eslint",
    "plugins": [],
    "env": {
        "browser": false
    },
    "extends": [
        "plugin:import/typescript"
    ],
    "settings": {
        "import/resolver": {
            "node": {
                "extensions": [".js", ".ts"]
            }
        }
    },
    "rules": {
        "require-atomic-updates": "off",
        "no-eq-null": "off",
        "eqeqeq": ["error", "always", {"null": "ignore"}],
        // Conflicts with prettier.
        "wrap-iife": "off",
        "lodash/callback-binding": "error",
        "lodash/collection-method-value": "error",
        "lodash/collection-return": "error",
        "lodash/no-double-unwrap": "error",
        "lodash/no-extra-args": "error",
        "lodash/unwrap": "error",
        "comma-dangle": "off",
        "react-hooks/rules-of-hooks": "error",
    }
}
