# projectsettings

Write your command content here.

This command will be available in chat with /projectsettings
json
{
  "rules": {
    "typescript": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true
    },
    "react": {
      "version": "18.2.0",
      "preferFunctionalComponents": true,
      "useHooks": true
    },
    "imports": {
      "preferNamedExports": true,
      "groupImports": true,
      "sortImports": true
    },
    "formatting": {
      "semi": true,
      "singleQuote": true,
      "trailingComma": "es5",
      "tabWidth": 2,
      "printWidth": 100
    }
  },
  "autoComplete": {
    "enabled": true,
    "suggestions": [
      "fabric.Canvas",
      "fabric.IText",
      "XLSX.read",
      "jsPDF",
      "PDFDocument"
    ]
  },
  "codeGeneration": {
    "componentTemplate": "functional-typescript",
    "includeTypes": true,
    "includeTests": false
  }
}
