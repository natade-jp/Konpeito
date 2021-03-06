# konpeito
[![Build Status](https://travis-ci.org/natade-jp/konpeito.svg?branch=master)](https://travis-ci.org/natade-jp/konpeito)
[![ESDoc coverage badge](https://natade-jp.github.io/konpeito/docs/badge.svg)](https://natade-jp.github.io/konpeito/docs/)
![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)

"konpeito" is a library to "compute". :)

## What
- The library for math calculations.
- When calculating, use method chain.
- Coding in ES6, and published ES6 modules and UMD.
- [API reference is complete](https://natade-jp.github.io/konpeito/docs/).

## Features
This library has 4 functions.
- BigInteger
- BigDecimal
- Fraction
- Matrix

Has the following features.
- BigDecimal and Fraction are constructed by BigInteger.
- Matrix is constructed by array of Complex.
- Matrix can't use huge real numbers like BigInteger or BigDecimal, but they are powerful. Initialization can be described as Scilab, Octave, MATLAB.
- Does not support sparse matrix.

Please check the console and main.mjs.
- [BigDecimal](https://natade-jp.github.io/konpeito/html/examples/demos/BigDecimal/)
- [BigInteger](https://natade-jp.github.io/konpeito/html/examples/demos/BigInteger/)
- [Matrix](https://natade-jp.github.io/konpeito/html/examples/demos/Matrix/)
- [UMD](https://natade-jp.github.io/konpeito/html/examples/demos/UMD/)

## Install for node.js

1. This library can be installed using [npm](https://www.npmjs.com/package/konpeito).
```
npm install konpeito
```

2. Then you can include it in your code:
```
var konpeito = require("konpeito");
```

If you want to use in the ES6 module, please execute with the following command.
```
node --experimental-modules main.mjs
```

## Install for browser

1. Download the [zip](https://github.com/natade-jp/konpeito/archive/master.zip) by [GitHub](https://github.com/natade-jp/konpeito).

2. Please use mjs file when using ES6 modules. And use js file when using UMD.
- `./build/konpeito.esm.min.js`
- `./build/konpeito.umd.min.js`

### with ES6 module.
```html
<script type="module" src="./main.mjs" charset="utf-8"></script>
```

### with UMD
```html
<script src="./konpeito.umd.min.js" charset="utf-8"></script>
<script src="./main.js" charset="utf-8"></script>
```

## Repository
- https://github.com/natade-jp/konpeito.git

## Sample

### BigInteger
- A calculation class for arbitrary-precision integer arithmetic.
- BigInt of ES2019 is not used.

```javascript
const konpeito = require("konpeito");
const BigInteger = konpeito.BigInteger;
const $ = BigInteger.create;

console.log($("-1234567890").mul("987654321098765432109876543210").toString());
> -1219326311248285321124828532111263526900

console.log($("7").pow("50").toString());
> 1798465042647412146620280340569649349251249
```

### BigDecimal
- A calculation class for arbitrary-precision floating point arithmetic.
- The calculation uses the BigInteger.

```javascript
const konpeito = require("konpeito");
const BigDecimal = konpeito.BigDecimal;
const MathContext = konpeito.MathContext;
const $ = BigDecimal.create;

BigDecimal.setDefaultContext(MathContext.UNLIMITED);
console.log($("-123456.7890").mul("987654321098765.432109876543210").toString());
> -121932631124828532112.4828532111263526900
```

### Fraction
- A calculation class for fractions with infinite precision.
- The calculation uses the BigInteger.

```javascript
const konpeito = require("konpeito");
const Fraction = konpeito.Fraction;
const $ = Fraction.create;

console.log($("1/3").add("0.(3)").mul(10).toString());
> 20 / 3
```

### Matrix
- Matrix is a general-purpose calculation class with signal processing and statistical processing.
- The calculation uses the Complex.
- Some methods do not support complex arithmetic.

```javascript
const konpeito = require("konpeito");
const Matrix = konpeito.Matrix;
const $ = Matrix.create;

console.log($("[1 2;3 4;5 6]").toString());
>
 1  2
 3  4
 5  6
const USV = $("[1 2;3 4;5 6]").svd();
console.log(USV.U.toString());
> 
 0.2298 -0.8835  0.4082
 0.5247 -0.2408 -0.8165
 0.8196  0.4019  0.4082
console.log(USV.S.toString());
> 
 9.5255  0.0000
 0.0000  0.5143
 0.0000  0.0000
console.log(USV.V.toString());
> 
 0.7849  0.6196
-0.6196  0.7849
console.log(USV.U.mul(USV.S).mul(USV.V.T()).toString());
> 
 1.0000  2.0000
 3.0000  4.0000
 5.0000  6.0000

console.log($("[1+j 2-3j -3 -4]").fft().toString());
> -4.0000 - 2.0000i  1.0000 - 5.0000i  0.0000 + 4.0000i  7.0000 + 7.0000i

console.log($("[1 2 30]").dct().toString());
> 19.0526 -20.5061  11.0227
```
