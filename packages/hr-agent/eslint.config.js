import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      // TypeScript 规则
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',

      // 基础规范 - 阿里风格
      'no-console': 'off',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'error',
      'no-throw-literal': 'error',
      'no-undef-init': 'error',
      'no-unneeded-ternary': 'error',
      'no-useless-constructor': 'error',
      'no-useless-return': 'error',
      radix: 'error',
      yoda: ['error', 'never'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
      'default-case': 'error',
      'no-fallthrough': 'error',
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
      'comma-dangle': ['error', 'never'],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'arrow-parens': ['error', 'always'],
      'arrow-spacing': 'error',
      'no-prototype-builtins': 'error',
      'no-array-constructor': 'error',
      'no-new-object': 'error',

      // 代码复杂度
      'max-depth': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      'max-lines-per-function': ['warn', 100],
      'max-params': ['warn', 4],
      complexity: ['warn', 10],
      'max-statements': ['warn', 30],
      'max-statements-per-line': ['error', { max: 1 }],

      // 命名规范
      camelcase: ['error', { properties: 'never', ignoreDestructuring: true }],

      // 最佳实践
      'no-magic-numbers': [
        'warn',
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true
        }
      ],
      'no-shadow': 'warn',
      'no-use-before-define': ['error', { functions: false }],
      'no-else-return': ['error', { allowElseIf: false }],
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-destructuring': [
        'warn',
        {
          array: true,
          object: true
        },
        {
          enforceForRenamedProperties: false
        }
      ],
      'no-redeclare': 'error',
      'no-sequences': 'error',
      'no-delete-var': 'error',
      'no-extend-native': 'error',
      'no-extra-boolean-cast': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'warn',
      'no-self-compare': 'error',
      'no-void': 'error',
      'no-with': 'error',

      // 风格相关
      indent: ['error', 2, { SwitchCase: 1 }],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }
      ],
      'keyword-spacing': 'error',
      'key-spacing': 'error',
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'block-spacing': 'error',
      'comma-spacing': 'error',
      'func-call-spacing': 'error',
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'array-bracket-spacing': 'error',
      'object-curly-spacing': ['error', 'always'],
      'computed-property-spacing': 'error',
      'no-spaced-func': 'error',
      'no-whitespace-before-property': 'error',
      'wrap-iife': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'padded-blocks': ['error', 'never']
    }
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'max-lines-per-function': 'off'
    }
  }
];
