# install
```
rm -rf node_modules
npm cache clear --force
npm install
```

# scripts
```
# Debug mode
npm run dev
# /html/examples/demos/ES6/
# You will be able to use the "Math.konpeito" on the console.

# Create scripts for distribution
npm run build
# /build/konpeito.module.mjs
# /build/konpeito.module.min.mjs
# /build/konpeito.umd.mjs
# /build/konpeito.module.min.mjs

# Create documents.
npm run doc
# /docs/

# Create typescript definition file.
npm run dts
# /build/konpeito.d.ts

# Run the test.
npm run test
# ^(/src/).*(.test.mjs)$

# Test only one file.
npm run test_target -- Matrix
npm run test_target -- Complex
npm run test_target -- LinearAlgebra
npm run test_target -- Signal
npm run test_target -- Statistics
npm run test_target -- BigInteger
npm run test_target -- BigDecimal
npm run test_target -- Fraction
npm run test_target -- Compatibility
...
```

# list
```
> npm list --depth=0
konpeito@2.0.0
+-- @types/jest@24.9.1
+-- babel-jest@24.9.0
+-- babel-plugin-transform-es2015-modules-commonjs@6.26.2
+-- esdoc@1.1.0
+-- esdoc-standard-plugin@1.0.0
+-- eslint@6.8.0
+-- eslint-plugin-jest@22.21.0
+-- jest@24.9.0
+-- jsdoc@3.6.3
+-- jsdoc-export-default-interop@0.3.1
+-- rollup@1.29.1
+-- rollup-plugin-buble@0.19.8
+-- rollup-plugin-uglify@6.0.4
+-- rollup-plugin-uglify-es@0.0.1
`-- tsd-jsdoc@2.4.0
```

# purpose
```
# Packaging the script described in the ES6.
npm install --save-dev rollup
npm install --save-dev rollup-plugin-buble
npm install --save-dev rollup-plugin-uglify
npm install --save-dev rollup-plugin-uglify-es

# For error check of ES6.
npm install --save-dev eslint
npm install --save-dev eslint-plugin-jest

# For document creation of ES6.
npm install --save-dev esdoc
npm install --save-dev esdoc-standard-plugin

# For unit test of ES6.
npm install --save-dev jest
npm install --save-dev @types/jest
npm install --save-dev babel-jest
npm install --save-dev babel-plugin-transform-es2015-modules-commonjs

# For typescript type definition creation.
npm install --save-dev jsdoc
npm install --save-dev jsdoc-export-default-interop
npm install --save-dev tsd-jsdoc
```

# update
```
npm update rollup rollup-plugin-buble rollup-plugin-uglify rollup-plugin-uglify-es
npm update eslint eslint-plugin-jest
npm update esdoc esdoc-standard-plugin
npm update jest @types/jest babel-jest babel-plugin-transform-es2015-modules-commonjs
npm update jsdoc jsdoc-export-default-interop tsd-jsdoc
```
