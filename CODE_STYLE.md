# files.httpreq.club code style
* four spaces indentation
* use double quotes instead of single quotes
* do not use `var`s - only use `const`s and `let`s
  * reason: [Use 'let' and 'const' instead of 'var'](https://evertpot.com/javascript-let-const/)
* if creating a global variable, put it as static in [Global.ts](src/Global.ts)
* do not use quotes in object keys
* use `===` for comparision instead of `==`
* use one `let` or `const` per variable
* do not use `console` for logging, instead use [Logger.ts](src/Logger.ts)
  * exception: `console.table`, `console.time` and `console.trace`
* variables/file names are using camelCase
  * exception: classes - they should use UpperCamelCase, that includes files that export just a class
* do not type parameters as `any` unless you explicitly mean that (example: [Logger.ts](src/Logger.ts))
