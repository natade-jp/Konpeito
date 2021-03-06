﻿/**
 * The script is part of konpeito.
 * 
 * AUTHOR:
 *  natade (http://twitter.com/natadea)
 * 
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import Polyfill from "../tools/Polyfill.js";
import BigInteger from "./BigInteger.js";
import RoundingMode, {RoundingModeEntity} from "./context/RoundingMode.js";
import MathContext from "./context/MathContext.js";
import Random from "./tools/Random.js";
import Fraction from "./Fraction.js";
import Complex from "./Complex.js";
import Matrix from "./Matrix.js";
import KonpeitoFloat from "./base/KonpeitoFloat.js";


/**
 * BigDecimal type argument.(local)
 * - number
 * - boolean
 * - string
 * - BigDecimal
 * - BigInteger
 * - {toBigDecimal:function}
 * - {doubleValue:number}
 * - {toString:function}
 * @typedef {number|boolean|string|BigDecimal|BigInteger|{toBigDecimal:function}|{doubleValue:number}|{toString:function}} KBigDecimalLocalInputData
 */

/**
 * ScaleData for argument of BigDecimal.
 * - {integer:BigInteger,scale:?number,context:?MathContext}
 * @typedef {{integer:BigInteger,scale:?number,context:?MathContext}} KBigDecimalScaleData
 */

/**
 * BigDecimal type argument.
 * - KBigDecimalLocalInputData
 * - Array<KBigDecimalLocalInputData|MathContext>
 * - KBigDecimalScaleData
 * 
 * Initialization can be performed as follows.
 * - 1200, "1200", "12e2", "1.2e3"
 * - When initializing with array. [ integer, [scale = 0], [context=default]].
 * - When initializing with object. { integer, [scale = 0], [context=default]}.
 * 
 * Description of the settings are as follows, you can also omitted.
 * - The "scale" is an integer scale factor.
 * - The "context" is used to normalize the created floating point.
 * 
 * If "context" is not specified, the "default_context" set for the class is used.
 * The "context" is the used when no environment settings are specified during calculation.
 * @typedef {KBigDecimalLocalInputData|Array<KBigDecimalLocalInputData|MathContext>|KBigDecimalScaleData} KBigDecimalInputData
 */

/**
 * Setting of calculation result of division.
 * @typedef {Object} KBigDecimalDivideType
 * @property {number} [scale] Scale of rounding.
 * @property {RoundingModeEntity} [roundingMode] Rounding mode.
 * @property {MathContext} [context] Configuration.(scale and roundingMode are unnecessary.)
 */

/**
 * Default MathContext class.
 * Used when MathContext not specified explicitly.
 * @type {MathContext[]}
 * @ignore
 */
const DEFAULT_CONTEXT_ = [];
DEFAULT_CONTEXT_[0] = MathContext.DECIMAL128;

/**
 * Collection of functions used in BigDecimal.
 * @ignore
 */
class BigDecimalTool {

	/**
	 * Create data for BigDecimal from strings.
	 * @param {string} ntext 
	 * @returns {{scale : number, integer : BigInteger}}
	 */
	static ToBigDecimalFromString(ntext) {
		let scale = 0;
		let buff;
		// 正規化
		let text = ntext.replace(/\s/g, "").toLowerCase();
		// 特殊な状態
		{
			if(/nan/.test(text)) {
				return {
					scale : 0,
					integer : BigInteger.NaN
				};
			}
			else if(/inf/.test(text)) {
				if(!/-/.test(text)) {
					return {
						scale : 0,
						integer : BigInteger.POSITIVE_INFINITY
					};
				}
				else {
					return {
						scale : 0,
						integer : BigInteger.NEGATIVE_INFINITY
					};
				}
			}
		}
		// +-の符号があるか
		let number_text = "";
		buff = text.match(/^[+-]+/);
		if(buff !== null) {
			buff = buff[0];
			text = text.substr(buff.length);
			if(buff.indexOf("-") !== -1) {
				number_text += "-";
			}
		}
		// 整数部があるか
		buff = text.match(/^[0-9]+/);
		if(buff !== null) {
			buff = buff[0];
			text = text.substr(buff.length);
			number_text += buff;
		}
		// 小数部があるか
		buff = text.match(/^\.[0-9]+/);
		if(buff !== null) {
			buff = buff[0];
			text = text.substr(buff.length);
			buff = buff.substr(1);
			scale = scale + buff.length;
			number_text += buff;
		}
		// 指数表記があるか
		buff = text.match(/^e[+-]?[0-9]+/);
		if(buff !== null) {
			buff = buff[0].substr(1);
			scale   = scale - parseInt(buff, 10);
		}
		return {
			scale : scale,
			integer : new BigInteger([number_text, 10])
		};
	}

	/**
	 * Create data for BigDecimal from number.
	 * @param {number|boolean} number 
	 * @returns {{scale : number, integer : BigInteger}}
	 */
	static ToBigDecimalFromNumber(number) {
		const value = typeof number !== "boolean" ? number : (number ? 1 : 0);
		if(!isFinite(value)) {
			if(value === Infinity) {
				return {
					scale : 0,
					integer : BigInteger.POSITIVE_INFINITY
				};
			}
			else if(value === - Infinity) {
				return {
					scale : 0,
					integer : BigInteger.NEGATIVE_INFINITY
				};
			}
			else {
				return {
					scale : 0,
					integer : BigInteger.NaN
				};
			}
		}
		// 0.0
		else if(value === 0) {
			return {
				scale : 0,
				integer : BigInteger.ZERO
			};
		}
		// 整数
		else if((Math.abs(value) >= 1.0 - Number.EPSILON) && ((Math.abs(value - Math.round(value)) <= Number.EPSILON))) {
			// 1以上の場合は誤差が計算範囲外なら無視して整数扱いする
			return {
				scale : 0,
				integer : new BigInteger(Math.round(value))
			};
		}
		// 浮動小数
		else {
			let scale = Math.trunc(Math.log(Math.abs(value)) / Math.log(10));
			let x = value / Math.pow(10, scale);
			// スケールを逆にする
			scale = - scale;
			for(let i = 0; i < 14; i++) {
				x = x * 10;
				scale = scale + 1;
				if(Math.abs(x - Math.round(x)) <= Number.EPSILON) {
					break;
				}
			}
			// 最も下の桁は四捨五入する
			x = Math.round(x * 1e14) / 1e14;
			return {
				scale : scale,
				integer : new BigInteger(x)
			};
			// 64ビットの実数型は15桁程度まで正しい
			// 余裕をもって12桁程度までを抜き出すのが良いかと思われる。
		}
	}
}

/**
 * Arbitrary-precision floating-point number class (immutable).
 */
export default class BigDecimal extends KonpeitoFloat {
	
	/**
	 * Create an arbitrary-precision floating-point number.
	 * 
	 * Initialization can be performed as follows.
	 * - 1200, "1200", "12e2", "1.2e3"
	 * - When initializing with array. [ integer, [scale = 0], [context=default]].
	 * - When initializing with object. { integer, [scale = 0], [context=default]}.
	 * 
	 * Description of the settings are as follows, you can also omitted.
	 * - The "scale" is an integer scale factor.
	 * - The "context" is used to normalize the created floating point.
	 * 
	 * If "context" is not specified, the "default_context" set for the class is used.
	 * The "context" is the used when no environment settings are specified during calculation.
	 * @param {KBigDecimalInputData} number - Real data.
	 */
	constructor(number) {
		super();

		/**
		 * The scale of this BigDecimal.
		 * @private
		 * @ignore
		 * @type {number}
		 */
		this._scale	= 0;
		
		/**
		 * Context used during initialization.
		 * @private
		 * @ignore
		 * @type {MathContext}
		 */
		this.context = BigDecimal.getDefaultContext();

		// この値がtrueの場合は最後に正規化を実行する
		let is_set_context = false;

		if(arguments.length > 1) {
			throw "BigDecimal Unsupported argument[" + arguments.length + "]";
		}
		if(number instanceof BigDecimal) {

			/**
			 * Integer part.
			 * @private
			 * @ignore
			 * @type {BigInteger}
			 */
			this.integer			= number.integer.clone();

			/**
			 * Integer part of string (for cache).
			 * @private
			 * @ignore
			 * @type {string}
			 */
			this.int_string			= number.int_string;

			this._scale				= number._scale;
			this.context			= number.context;

		}
		else if((typeof number === "number") || (typeof number === "boolean")) {
			const data = BigDecimalTool.ToBigDecimalFromNumber(number);
			this.integer	= data.integer;
			this._scale		= data.scale;
		}
		else if(typeof number === "string") {
			const data = BigDecimalTool.ToBigDecimalFromString(number);
			this.integer	= data.integer;
			this._scale		= data.scale;
		}
		else if(number instanceof Array) {
			if(number.length >= 1) {
				const prm1 = number[0];
				if((typeof prm1 === "number") || (typeof prm1 === "boolean")) {
					const data		= BigDecimalTool.ToBigDecimalFromNumber(prm1);
					this.integer	= data.integer;
					this._scale		= data.scale;
				}
				else if(typeof prm1 === "string") {
					const data		= BigDecimalTool.ToBigDecimalFromString(prm1);
					this.integer	= data.integer;
					this._scale		= data.scale;
				}
				else if(prm1 instanceof BigDecimal) {
					this.integer	= prm1.integer.clone();
					this._scale		= prm1._scale;
				}
				else if(prm1 instanceof BigInteger) {
					this.integer			= prm1.clone();
				}
				else if(typeof prm1 === "object") {
					if("toBigDecimal" in prm1) {
						const data		= prm1.toBigDecimal();
						this.integer	= data.integer;
						this._scale		= data._scale;
					}
					else if("doubleValue" in prm1) {
						const data = BigDecimalTool.ToBigDecimalFromNumber(prm1.doubleValue);
						this.integer	= data.integer;
						this._scale		= data.scale;
					}
					else {
						const data = BigDecimalTool.ToBigDecimalFromString(prm1.toString());
						this.integer	= data.integer;
						this._scale		= data.scale;
					}
				}
				else {
					throw "BigDecimal Unsupported argument " + prm1 + "(" + (typeof prm1) + ")";
				}
			}
			if(number.length >= 2) {
				// スケール値を省略しているかどうかを、数値かどうかで判定している。
				if(typeof number[1] === "number") {
					// 2つめが数値の場合は、2つ目をスケール値として使用する
					this._scale	= number[1];
					if(number.length >= 3) {
						this.context = ((number[2] !== undefined) && (number[2] instanceof MathContext)) ? number[2] : BigDecimal.getDefaultContext();
						is_set_context = true;
					}
				}
				else {
					if(number.length >= 2) {
						this.context = ((number[1] !== undefined) && (number[1] instanceof MathContext)) ? number[1] : BigDecimal.getDefaultContext();
						is_set_context = true;
					}
				}
			}
		}
		else if(number instanceof BigInteger) {
			this.integer	= number.clone();
		}
		else if(typeof number === "object") {
			if("toBigDecimal" in number) {
				const data		= number.toBigDecimal();
				this.integer	= data.integer;
				this._scale		= data._scale;
				this.context	= data.context;
			}
			else if("doubleValue" in number) {
				const data = BigDecimalTool.ToBigDecimalFromNumber(number.doubleValue);
				this.integer	= data.integer;
				this._scale		= data.scale;
			}
			else if(("integer" in number) && ("scale" in number) && ("context" in number)) {
				this.integer	= new BigInteger(number.integer);
				if(number.scale) {
					this._scale = number.scale;
				}
				if(number.context) {
					this.context = number.context;
					is_set_context = true;
				}
			}
			else if(number instanceof Object) {
				const data = BigDecimalTool.ToBigDecimalFromString(number.toString());
				this.integer	= data.integer;
				this._scale		= data.scale;
			}
		}
		else {
			throw "BigDecimal Unsupported argument " + arguments;
		}
		// データを正規化
		if(is_set_context) {
			const newbigdecimal = this.round(this.context);
			this.integer	= newbigdecimal.integer;
			this._scale		= newbigdecimal._scale;
			delete this.int_string;
		}
		// データが正しいかチェックする
		if((!(this.integer instanceof BigInteger)) || (!(this.context instanceof MathContext))) {
			throw "BigDecimal Unsupported argument " + arguments;
		}
	}

	/**
	 * Create an arbitrary-precision floating-point number.
	 * 
	 * Initialization can be performed as follows.
	 * - 1200, "1200", "12e2", "1.2e3"
	 * - When initializing with array. [ integer, [scale = 0], [context=default]].
	 * - When initializing with object. { integer, [scale = 0], [context=default]}.
	 * 
	 * Description of the settings are as follows, you can also omitted.
	 * - The "scale" is an integer scale factor.
	 * - The "context" is used to normalize the created floating point.
	 * 
	 * If "context" is not specified, the "default_context" set for the class is used.
	 * The "context" is the used when no environment settings are specified during calculation.
	 * @param {KBigDecimalInputData} number - Real data.
	 * @returns {BigDecimal}
	 */
	static create(number) {
		if(number instanceof BigDecimal) {
			return number;
		}
		else {
			return new BigDecimal(number);
		}
	}

	/**
	 * Convert number to BigDecimal type.
	 * @param {KBigDecimalLocalInputData} x 
	 * @param {MathContext} [scale] 
	 * @returns {BigDecimal}
	 */
	static valueOf(x, scale) {
		if(arguments.length === 1) {
			return new BigDecimal(x);
		}
		else {
			return new BigDecimal([x, scale]);
		}
	}

	/**
	 * Convert to BigDecimal.
	 * If type conversion is unnecessary, return the value as it is.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal}
	 * @ignore
	 */
	static _toBigDecimal(number) {
		if(number instanceof BigDecimal) {
			return number;
		}
		else {
			return new BigDecimal(number);
		}
	}

	/**
	 * Convert to BigInteger.
	 * If type conversion is unnecessary, return the value as it is.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigInteger}
	 * @ignore
	 */
	static _toBigInteger(number) {
		if(number instanceof BigInteger) {
			return number;
		}
		else if(number instanceof BigDecimal) {
			return number.toBigInteger();
		}
		else {
			return new BigInteger(number);
		}
	}

	/**
	 * Convert to real number.
	 * @param {KBigDecimalInputData} number 
	 * @returns {number}
	 * @ignore
	 */
	static _toFloat(number) {
		if(typeof number === "number") {
			return number;
		}
		else if(number instanceof BigDecimal) {
			return number.doubleValue;
		}
		else {
			return (new BigDecimal(number)).doubleValue;
		}
	}

	/**
	 * Convert to integer.
	 * @param {KBigDecimalInputData} number 
	 * @returns {number}
	 * @ignore
	 */
	static _toInteger(number) {
		if(typeof number === "number") {
			return Math.trunc(number);
		}
		else if(number instanceof BigInteger) {
			return number.intValue;
		}
		else {
			return (new BigInteger(number)).intValue;
		}
	}

	/**
	 * Return string of this number without sign.
	 * If cache is already created, return cache.
	 * @returns {string} 
	 */
	_getUnsignedIntegerString() {
		// キャッシュする
		if(typeof this.int_string === "undefined") {
			this.int_string = this.integer.toString(10).replace(/^-/, "");
		}
		return this.int_string;
	}

	/**
	 * Deep copy.
	 * @returns {BigDecimal} 
	 */
	clone() {
		return new BigDecimal(this);
	}
	
	/**
	 * The scale of this BigDecimal.
	 * @returns {number} 
	 */
	scale() {
		return this._scale;
	}

	/**
	 * The positive or negative sign of this number.
	 * - +1 if positive, -1 if negative, 0 if 0.
	 * @returns {number}
	 */
	sign() {
		if(!this.isFinite()) {
			return this.isNaN() ? NaN : (this.isPositiveInfinity() ? 1 : -1);
		}
		return this.integer.sign();
	}

	/**
	 * Precision.
	 * @returns {number} 
	 */
	precision() {
		return this._getUnsignedIntegerString().length;
	}

	/**
	 * An integer with the exponent part removed.
	 * @returns {BigInteger} 
	 */
	unscaledValue() {
		return new BigInteger(this.integer);
	}

	/**
	 * The smallest value that can be represented with the set precision.
	 * @returns {BigDecimal} 
	 */
	ulp() {
		return new BigDecimal([BigInteger.ONE, this.scale()]);
	}

	/**
	 * Absolute value.
	 * @returns {BigDecimal} abs(A)
	 */
	abs() {
		const output = this.clone();
		output.integer = output.integer.abs();
		return output;
	}

	/**
	 * this * 1
	 * @returns {BigDecimal} +A
	 */
	plus() {
		return this;
	}

	/**
	 * this * -1
	 * @returns {BigDecimal} -A
	 */
	negate() {
		const output = this.clone();
		output.integer = output.integer.negate();
		return output;
	}

	/**
	 * Move the decimal point to the left.
	 * @param {KBigDecimalInputData} n 
	 * @returns {BigDecimal} 
	 */
	movePointLeft(n) {
		if(!this.isFinite()) {
			return this;
		}
		const x = BigDecimal._toInteger(n);
		let output = this.scaleByPowerOfTen( -x );
		output = output.setScale(Math.max(this.scale() + x, 0));
		return output;
	}

	/**
	 * Move the decimal point to the right.
	 * @param {KBigDecimalInputData} n 
	 * @returns {BigDecimal} 
	 */
	movePointRight(n) {
		return this.movePointLeft(-n);
	}

	/**
	 * Remove the 0 to the right of the numbers and normalize the scale.
	 * @returns {BigDecimal} 
	 */
	stripTrailingZeros() {
		if(!this.isFinite()) {
			return this;
		}
		// 0をできる限り取り除く
		const sign		= this.sign();
		const sign_text	= sign >= 0 ? "" : "-";
		const text		= this.integer.toString(10).replace(/^-/, "");
		const zeros		= text.match(/0+$/);
		let zero_length	= (zeros !== null) ? zeros[0].length : 0;
		if(zero_length === text.length) {
			// 全て 0 なら 1 ケタ残す
			zero_length = text.length - 1;
		}
		const newScale	= this.scale() - zero_length;
		return new BigDecimal([new BigInteger(sign_text + text.substring(0, text.length - zero_length)), newScale]);
	}

	// ----------------------
	// 環境設定用
	// ----------------------
	
	/**
	 * Set default the MathContext.
	 * - This is used if you do not specify MathContext when creating a new object.
	 * @param {MathContext} [context=MathContext.DECIMAL128]
	 */
	static setDefaultContext(context) {
		DEFAULT_CONTEXT_[DEFAULT_CONTEXT_.length - 1] = context ? context : MathContext.DECIMAL128;
	}

	/**
	 * Return default MathContext class.
	 * - Used when MathContext not specified explicitly.
	 * @returns {MathContext}
	 */
	static getDefaultContext() {
		return DEFAULT_CONTEXT_[DEFAULT_CONTEXT_.length - 1];
	}

	/**
	 * Push default the MathContext.
	 * - Use with `popDefaultContext` when you want to switch settings temporarily.
	 * @param {MathContext} [context]
	 */
	static pushDefaultContext(context) {
		DEFAULT_CONTEXT_.push(context);
	}

	/**
	 * Pop default the MathContext.
	 * - Use with `pushDefaultContext` when you want to switch settings temporarily.
	 */
	static popDefaultContext() {
		DEFAULT_CONTEXT_.pop();
	}

	// ----------------------
	// 他の型に変換用
	// ----------------------
	
	/**
	 * boolean value.
	 * @returns {boolean}
	 */
	get booleanValue() {
		return this.integer.booleanValue;
	}

	/**
	 * 32-bit integer value.
	 * @returns {number}
	 */
	get intValue() {
		if(!this.isFinite()) {
			return this.isNaN() ? NaN : (this.isPositiveInfinity() ? Infinity : -Infinity);
		}
		const bigintdata = this.toBigInteger();
		const x = bigintdata.intValue;
		return x & 0xFFFFFFFF;
	}

	/**
	 * 32-bit integer value.
	 * An error occurs if conversion fails.
	 * @returns {number}
	 */
	get intValueExact() {
		if(!this.isFinite()) {
			throw "ArithmeticException";
		}
		const bigintdata = this.toBigInteger();
		const x = bigintdata.intValue;
		if((x < -2147483648) || (2147483647 < x)) {
			throw "ArithmeticException";
		}
		return x;
	}

	/**
	 * 32-bit floating point.
	 * @returns {number}
	 */
	get floatValue() {
		if(!this.isFinite()) {
			return this.isNaN() ? NaN : (this.isPositiveInfinity() ? Infinity : -Infinity);
		}
		const p = this.precision();
		if(MathContext.DECIMAL32.getPrecision() < p) {
			return(this.sign() >= 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
		}
		return parseFloat(this.toEngineeringString());
	}

	/**
	 * 64-bit floating point.
	 * @returns {number}
	 */
	get doubleValue() {
		if(!this.isFinite()) {
			return this.isNaN() ? NaN : (this.isPositiveInfinity() ? Infinity : -Infinity);
		}
		return parseFloat(this.toEngineeringString());
	}

	// ----------------------
	// konpeito で扱う数値型へ変換
	// ----------------------
	
	/**
	 * return BigInteger.
	 * @returns {BigInteger}
	 */
	toBigInteger() {
		return this.integer.scaleByPowerOfTen(-this.scale());
	}

	/**
	 * return BigDecimal.
	 * @param {MathContext} [mc] - MathContext setting after calculation. 
	 * @returns {BigDecimal}
	 */
	toBigDecimal(mc) {
		if(mc) {
			return this.round(mc);
		}
		else {
			return this;
		}
	}
	
	/**
	 * return Fraction.
	 * @returns {Fraction}
	 */
	toFraction() {
		return new Fraction(this);
	}

	/**
	 * return Complex.
	 * @returns {Complex}
	 */
	toComplex() {
		return new Complex(this);
	}
	
	/**
	 * return Matrix.
	 * @returns {Matrix}
	 */
	toMatrix() {
		return new Matrix(this);
	}

	// ----------------------
	// 文字列化
	// ----------------------
	
	/**
	 * Convert to string.
	 * @returns {string} 
	 */
	toString() {
		if(!this.isFinite()) {
			return this.isNaN() ? "NaN" : (this.isPositiveInfinity() ? "Infinity" : "-Infinity");
		}
		// 「調整された指数」
		const x = - this.scale() + (this.precision() - 1);
		// スケールが 0 以上で、「調整された指数」が -6 以上
		if((this.scale() >= 0) && (x >= -6)) {
			return this.toPlainString();
		}
		else {
			return this.toScientificNotation(x);
		}
	}

	/**
	 * Convert to JSON.
	 * @returns {string} 
	 */
	toJSON() {
		return this.toString();
	}

	/**
	 * Convert to string using scientific notation.
	 * @param {KBigDecimalInputData} e_len - Number of digits in exponent part.
	 * @returns {string} 
	 */
	toScientificNotation(e_len) {
		if(!this.isFinite()) {
			return this.isNaN() ? "NaN" : (this.isPositiveInfinity() ? "Infinity" : "-Infinity");
		}
		const e		= BigDecimal._toInteger(e_len);
		const text	= this._getUnsignedIntegerString();
		let s		= this.scale();
		const x		= [];
		let i, k;
		// -
		if(this.sign() === -1) {
			x[x.length] = "-";
		}
		// 表示上の桁数
		s = - e - s;
		// 小数点が付かない
		if(s >= 0) {
			x[x.length] = text;
			for(i = 0; i < s; i++) {
				x[x.length] = "0";
			}
		}
		// 小数点が付く
		else {
			k = this.precision() + s;
			if(0 < k) {
				x[x.length] = text.substring(0, k);
				x[x.length] = ".";
				x[x.length] = text.substring(k, text.length);
			}
			else {
				k = - k;
				x[x.length] = "0.";
				for(i = 0; i < k; i++) {
					x[x.length] = "0";
				}
				x[x.length] = text;
			}
		}
		x[x.length] = "E";
		if(e >= 0) {
			x[x.length] = "+";
		}
		x[x.length] = e;
		return x.join("");
	}

	/**
	 * Convert to string usding technical notation.
	 * @returns {string} 
	 */
	toEngineeringString() {
		if(!this.isFinite()) {
			return this.isNaN() ? "NaN" : (this.isPositiveInfinity() ? "Infinity" : "-Infinity");
		}
		// 「調整された指数」
		const x = - this.scale() + (this.precision() - 1);
		// スケールが 0 以上で、「調整された指数」が -6 以上
		if((this.scale() >= 0) && (x >= -6)) {
			return this.toPlainString();
		}
		else {
			// 0 でない値の整数部が 1 〜 999 の範囲に収まるように調整
			return this.toScientificNotation(Math.floor(x / 3) * 3);
		}
	}

	/**
	 * Convert to string without exponential notation.
	 * @returns {string} 
	 */
	toPlainString() {
		if(!this.isFinite()) {
			return this.isNaN() ? "NaN" : (this.isPositiveInfinity() ? "Infinity" : "-Infinity");
		}
		// スケールの変換なし
		if(this.scale() === 0) {
			if(this.sign() < 0) {
				return "-" + this._getUnsignedIntegerString();
			}
			else {
				return this._getUnsignedIntegerString();
			}
		}
		// 指数0で文字列を作成後、Eの後ろの部分をとっぱらう
		const text = this.toScientificNotation(0);
		return text.match(/^[^E]*/)[0];
	}

	// ----------------------
	// 比較
	// ----------------------
	
	/**
	 * Equals.
	 * - Attention : Test for equality, including the precision and the scale. 
	 * - Use the "compareTo" if you only want to find out whether they are also mathematically equal.
	 * - If you specify a "tolerance", it is calculated by ignoring the test of the precision and the scale.
	 * @param {KBigDecimalInputData} number 
	 * @param {KBigDecimalInputData} [tolerance] - Calculation tolerance of calculation.
	 * @returns {boolean} A === B
	 */
	equals(number, tolerance) {
		// 誤差を指定しない場合は、厳密に調査
		if(!tolerance) {
			if((number instanceof BigDecimal) || (typeof number === "string")) {
				const val = number instanceof BigDecimal ? number : BigDecimal._toBigDecimal(number);
				if(this.isNaN() || val.isNaN()) {
					return false;
				}
				else {
					return (this.equalsState(val) && (this._scale === val._scale) && this.integer.equals(val.integer));
				}
			}
			else {
				return this.compareTo(number) === 0;
			}
		}
		else {
			return this.compareTo(number, tolerance) === 0;
		}
	}

	/**
	 * Numeric type match.
	 * @param {KBigDecimalInputData} number 
	 * @returns {boolean}
	 */
	equalsState(number) {
		const x = this;
		const y = BigDecimal._toBigDecimal(number);
		return x.integer.equalsState(y.integer);
	}

	/**
	 * Compare values.
	 * @param {KBigDecimalInputData} number
	 * @param {KBigDecimalInputData} [tolerance=0] - Calculation tolerance of calculation.
	 * @returns {number} A > B ? 1 : (A === B ? 0 : -1)
	 */
	compareTo(number, tolerance) {
		const src = this;
		const tgt = BigDecimal._toBigDecimal(number);
		// 特殊な条件
		if(!src.isFinite() || !tgt.isFinite()) {
			return src.integer.compareTo(tgt.integer);
		}
		// 通常の条件
		if(!tolerance) {
			// 誤差の指定がない場合
			// 簡易計算
			{
				const src_sign	= src.sign();
				const tgt_sign	= tgt.sign();
				if((src_sign === 0) && (src_sign === tgt_sign)) {
					return 0;
				}
				else if(src_sign === 0) {
					return - tgt_sign;
				}
				else if(tgt_sign === 0) {
					return src_sign;
				}
			}
			// 実際に計算する
			if(src._scale === tgt._scale) {
				return src.integer.compareTo(tgt.integer);
			}
			else if(src._scale > tgt._scale) {
				const newdst = tgt.setScale(src._scale);
				return src.integer.compareTo(newdst.integer);
			}
			else {
				const newsrc = src.setScale(tgt._scale);
				return newsrc.integer.compareTo(tgt.integer);
			}
		}
		else {
			const tolerance_ = BigDecimal._toBigDecimal(tolerance);
			BigDecimal.pushDefaultContext(MathContext.UNLIMITED);
			const delta = src.sub(tgt);
			BigDecimal.popDefaultContext();
			const delta_abs = delta.abs();
			if(delta_abs.compareTo(tolerance_) <= 0) {
				return 0;
			}
			else {
				return delta.sign();
			}
		}
	}

	/**
	 * Maximum number.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} max([A, B])
	 */
	max(number) {
		const val = BigDecimal._toBigDecimal(number);
		if(this.isNaN() || val.isNaN()) {
			return BigDecimal.NaN;
		}
		if(this.compareTo(val) >= 0) {
			return this.clone();
		}
		else {
			return val.clone();
		}
	}

	/**
	 * Minimum number.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} min([A, B])
	 */
	min(number) {
		const val = BigDecimal._toBigDecimal(number);
		if(this.isNaN() || val.isNaN()) {
			return BigDecimal.NaN;
		}
		if(this.compareTo(val) <= 0) {
			return this.clone();
		}
		else {
			return val.clone();
		}
	}

	/**
	 * Clip number within range.
	 * @param {KBigDecimalInputData} min
	 * @param {KBigDecimalInputData} max
	 * @returns {BigDecimal} min(max(x, min), max)
	 */
	clip(min, max) {
		const min_ = BigDecimal._toBigDecimal(min);
		const max_ = BigDecimal._toBigDecimal(max);
		if(this.isNaN() || min_.isNaN() || max_.isNaN()) {
			return BigDecimal.NaN;
		}
		const arg_check = min_.compareTo(max_);
		if(arg_check === 1) {
			throw "clip(min, max) error. (min > max)->(" + min_ + " > " + max_ + ")";
		}
		else if(arg_check === 0) {
			return min_;
		}
		if(this.compareTo(max_) === 1) {
			return max_;
		}
		else if(this.compareTo(min_) === -1) {
			return min_;
		}
		return this;
	}

	// ----------------------
	// 丸め
	// ----------------------
	
	/**
	 * Change the scale.
	 * @param {KBigDecimalInputData} new_scale - New scale.
	 * @param {RoundingModeEntity} [rounding_mode=RoundingMode.UNNECESSARY] - Rounding method when converting precision.
	 * @returns {BigDecimal} 
	 */
	setScale(new_scale, rounding_mode) {
		if(!this.isFinite()) {
			return this;
		}
		const newScale = BigDecimal._toInteger(new_scale);
		if(this.scale() === newScale) {
			// scaleが同一なので処理の必要なし
			return(this.clone());
		}
		const roundingMode = (rounding_mode !== undefined) ? RoundingMode.valueOf(rounding_mode) : RoundingMode.UNNECESSARY;
		// 文字列を扱ううえで、符号があるとやりにくいので外しておく
		let text		= this._getUnsignedIntegerString();
		const sign		= this.sign();
		const sign_text	= sign >= 0 ? "" : "-";
		// scale の誤差
		// 0 以上なら 0 を加えればいい。0未満なら0を削るか、四捨五入など丸めを行う
		const delta		= newScale - this.scale();	// この桁分増やすといい
		if(0 <= delta) {
			// 0を加える
			let i;
			for(i = 0; i < delta; i++) {
				text = text + "0";
			}
			return new BigDecimal([new BigInteger(sign_text + text), newScale]);
		}
		const keta = text.length + delta;		// 最終的な桁数
		const keta_marume = keta + 1;
		if(keta <= 0) {
			// 指定した scale では設定できない場合
			// 例えば "0.1".setScale(-2), "10".setScale(-3) としても表すことは不可能であるため、
			// sign（-1, 0, +1）のどれかの数値を使用して丸める
			const outdata = (sign + roundingMode.getAddNumber(sign)) / 10;
			// 上記の式は、CEILINGなら必ず1、正でCEILINGなら1、負でFLOORなら1、それ以外は0となり、
			// さらに元々の数値が 0 なら 0、切り捨て不能なら例外が返る計算式である。
			// これは Java の動作をまねています。
			return new BigDecimal([new BigInteger(outdata), newScale]);
		}
		{
			// 0を削るだけで解決する場合
			// 単純な切捨て(0を削るのみ)
			const zeros			= text.match(/0+$/);
			const zero_length		= (zeros !== null) ? zeros[0].length : 0;
			if(( (zero_length + delta) >= 0 ) || (roundingMode === RoundingMode.DOWN)) {
				return new BigDecimal([new BigInteger(sign_text + text.substring(0, keta)), newScale]);
			}
		}
		{
			// 丸め計算で解決する場合
			// 12345 -> '123'45
			text = text.substring(0, keta_marume);
			// 丸め計算に必要な切り取る桁数(後ろの1～2桁を取得)
			const cutsize = text.length > 1 ? 2 : 1;
			// '123'45 -> 1'23'4
			const number = parseInt(text.substring(text.length - cutsize, text.length)) * sign;
			// 「元の数」と「丸めに必要な数」を足す
			const x1 = new BigInteger(sign_text + text);
			const x2 = new BigInteger(roundingMode.getAddNumber(number));
			text = x1.add(x2).toString();
			// 丸め後の桁数に戻して
			return new BigDecimal([new BigInteger(text.substring(0, text.length - 1)), newScale]);
		}
	}

	/**
	 * Round with specified settings.
	 * 
	 * - This method is not a method round the decimal point.
	 * - This method converts numbers in the specified Context and rounds unconvertible digits.
	 * 
	 * Use `this.setScale(0, RoundingMode.HALF_UP)` if you want to round the decimal point.
	 * When the argument is omitted, such decimal point rounding operation is performed.
	 * @param {MathContext} [mc] - New setting.
	 * @returns {BigDecimal} 
	 */
	round(mc) {
		if(!this.isFinite()) {
			return this;
		}
		if(arguments.length === 1) {
			if(mc !== undefined) {
				// MathContext を設定した場合
				if(!(mc instanceof MathContext)) {
					throw "not MathContext";
				}
				const newPrecision	= mc.getPrecision();
				const delta			= newPrecision - this.precision();
				if((delta === 0)||(newPrecision === 0)) {
					return this.clone();
				}
				const newBigDecimal = this.setScale( this.scale() + delta, mc.getRoundingMode());
				/* 精度を上げる必要があるため、0を加えた場合 */
				if(delta > 0) {
					return newBigDecimal;
				}
				/* 精度を下げる必要があるため、丸めた場合は、桁の数が正しいか調べる */
				if(newBigDecimal.precision() === mc.getPrecision()) {
					return newBigDecimal;
				}
				/* 切り上げなどで桁数が１つ増えた場合 */
				const sign_text	= newBigDecimal.integer.sign() >= 0 ? "" : "-";
				const abs_text	= newBigDecimal._getUnsignedIntegerString();
				const inte_text	= sign_text + abs_text.substring(0, abs_text.length - 1);
				return new BigDecimal([new BigInteger(inte_text), newBigDecimal.scale() - 1]);
			}
			else {
				return this;
			}
		}
		else {
			// 小数点以下を四捨五入する
			return this.setScale(0, RoundingMode.HALF_UP);
		}
	}

	/**
	 * Floor.
	 * @returns {BigDecimal} floor(A)
	 */
	floor() {
		if(!this.isFinite()) {
			return this;
		}
		return this.setScale(0, RoundingMode.FLOOR);
	}

	/**
	 * Ceil.
	 * @returns {BigDecimal} ceil(A)
	 */
	ceil() {
		if(!this.isFinite()) {
			return this;
		}
		return this.setScale(0, RoundingMode.CEILING);
	}
	
	/**
	 * To integer rounded down to the nearest.
	 * @returns {BigDecimal} fix(A), trunc(A)
	 */
	fix() {
		if(!this.isFinite()) {
			return this;
		}
		return this.setScale(0, RoundingMode.DOWN);
	}

	/**
	 * Fraction.
	 * @returns {BigDecimal} fract(A)
	 */
	fract() {
		if(!this.isFinite()) {
			return BigDecimal.NaN;
		}
		return this.sub(this.floor());
	}

	// ----------------------
	// 四則演算
	// ----------------------
	
	/**
	 * Add.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} A + B
	 */
	add(number) {
		const augend = BigDecimal._toBigDecimal(number);
		const src			= this;
		const tgt			= augend;
		if(!src.isFinite() || !tgt.isFinite()) {
			if(src.isNaN() || tgt.isNaN() || (src.isInfinite() && tgt.isInfinite() && !src.equalsState(tgt))) {
				return BigDecimal.NaN;
			}
			else if(src.isPositiveInfinity() || tgt.isPositiveInfinity()) {
				return BigDecimal.POSITIVE_INFINITY;
			}
			else {
				return BigDecimal.NEGATIVE_INFINITY;
			}
		}
		const mc = BigDecimal.getDefaultContext();
		const newscale	= Math.max(src._scale, tgt._scale);
		if(src._scale === tgt._scale) {
			// 1 e1 + 1 e1 = 1
			return new BigDecimal([src.integer.add(tgt.integer), newscale, mc]);
		}
		else if(src._scale > tgt._scale) {
			// 1 e-2 + 1 e-1
			const newdst = tgt.setScale(src._scale);
			// 0.01 + 0.10 = 0.11 = 11 e-2
			return new BigDecimal([src.integer.add(newdst.integer), newscale, mc]);
		}
		else {
			// 1 e-1 + 1 e-2
			const newsrc = src.setScale(tgt._scale);
			// 0.1 + 0.01 = 0.11 = 11 e-2
			return new BigDecimal([newsrc.integer.add(tgt.integer), newscale, mc]);
		}
	}

	/**
	 * Subtract.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} A - B
	 */
	sub(number) {
		const subtrahend = BigDecimal._toBigDecimal(number);
		return this.add(subtrahend.negate());
	}

	/**
	 * Multiply.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} A * B
	 */
	mul(number) {
		const multiplicand = BigDecimal._toBigDecimal(number);
		const src			= this;
		const tgt			= multiplicand;
		if(!src.isFinite() || !tgt.isFinite()) {
			if(src.isNaN() || tgt.isNaN() || (src.isZero() || tgt.isZero())) {
				return BigDecimal.NaN;
			}
			else if(src.sign() * tgt.sign() > 0) {
				return BigDecimal.POSITIVE_INFINITY;
			}
			else {
				return BigDecimal.NEGATIVE_INFINITY;
			}
		}
		const mc = BigDecimal.getDefaultContext();
		const newinteger	= src.integer.mul(tgt.integer);
		// 0.1 * 0.01 = 0.001
		const newscale	= src._scale + tgt._scale;
		return new BigDecimal([newinteger, newscale, mc]);
	}

	/**
	 * Divide not calculated to the decimal point.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} (int)(A / B)
	 */
	divideToIntegralValue(number) {
		const divisor = BigDecimal._toBigDecimal(number);
		const src		= this;
		const tgt		= divisor;
		if(!src.isFinite() || !tgt.isFinite()) {
			if(src.isNaN() || tgt.isNaN() || (src.isInfinite() && tgt.isInfinite())) {
				return BigDecimal.NaN;
			}
			else if(src.isInfinite()) {
				if(src.sign() * tgt.sign() >= 0) {
					return BigDecimal.POSITIVE_INFINITY;
				}
				else {
					return BigDecimal.NEGATIVE_INFINITY;
				}
			}
			else {
				return BigDecimal.ZERO;
			}
		}
		else if(tgt.isZero()) {
			if(src.isZero()) {
				return BigDecimal.NaN;
			}
			else {
				return src.sign() >= 0 ? BigDecimal.POSITIVE_INFINITY : BigDecimal.NEGATIVE_INFINITY;
			}
		}
		const mc = BigDecimal.getDefaultContext();
		/**
		 * @param {number} num 
		 * @returns {BigInteger}
		 */
		const getDigit  = function( num ) {
			let i;
			let text = "1";
			for(i = 0; i < num; i++) {
				text = text + "0";
			}
			return new BigInteger(text);
		};
		if(tgt.compareTo(BigDecimal.ZERO) === 0) {
			throw "ArithmeticException";
		}

		// 1000e0		/	1e2				=	1000e-2
		// 1000e0		/	10e1			=	100e-1
		// 1000e0		/	100e0			=	10e0
		// 1000e0		/	1000e-1			=	1e1
		// 1000e0		/	10000e-2		=	1e1
		// 1000e0		/	100000e-3		=	1e1

		// 10e2			/	100e0			=	1e1
		// 100e1		/	100e0			=	1e1
		// 1000e0		/	100e0			=	10e0
		// 10000e-1		/	100e0			=	100e-1	
		// 100000e-2	/	100e0			=	1000e-2
		let src_integer	= src.integer;
		let tgt_integer	= tgt.integer;
		const newScale	= src._scale - tgt._scale;

		// 100e-2 / 3e-1 = 1 / 0.3 -> 100 / 30
		if(src._scale > tgt._scale) {
			// src._scale に合わせる
			tgt_integer = tgt_integer.mul(getDigit(  newScale ));
		}
		// 1e-1 / 3e-2 = 0.1 / 0.03 -> 10 / 3
		else if(src._scale < tgt._scale) {
			// tgt._scale に合わせる
			src_integer = src_integer.mul(getDigit( -newScale ));
		}

		// とりあえず計算結果だけ作ってしまう
		const new_integer	= src_integer.div(tgt_integer);
		const sign			= new_integer.sign();
		if(sign !== 0) {
			const text	= new_integer.toString(10).replace(/^-/, "");
			// 指定した桁では表すことができない
			if((mc.getPrecision() !== 0) && (text.length > mc.getPrecision())) {
				throw "ArithmeticException";
			}
			// 結果の優先スケール に合わせる (this.scale() - divisor.scale())
			if(text.length <= (-newScale)) {
				// 合わせることができないので、0をできる限り削る = stripTrailingZerosメソッド
				const zeros			= text.match(/0+$/);
				const zero_length	= (zeros !== null) ? zeros[0].length : 0;
				const sign_text		= sign >= 0 ? "" : "-";
				return new BigDecimal([new BigInteger(sign_text + text.substring(0, text.length - zero_length)), -zero_length, mc]);
			}
		}

		let output = new BigDecimal(new_integer);
		output = output.setScale(newScale, RoundingMode.UP);
		output = output.round(mc);
		output.context = mc;
		return output;
	}

	/**
	 * Divide and remainder.
	 * @param {KBigDecimalInputData} number
	 * @returns {Array<BigDecimal>} [C = (int)(A / B), A - C * B]
	 */
	divideAndRemainder(number) {
		const divisor = BigDecimal._toBigDecimal(number);
		if(!this.isFinite() || !divisor.isFinite()) {
			if(this.isNaN() || divisor.isNaN() || (this.isInfinite() && divisor.isInfinite())) {
				return [BigDecimal.NaN, BigDecimal.NaN];
			}
			else if(this.isInfinite()) {
				if(this.sign() * divisor.sign() >= 0) {
					return [BigDecimal.POSITIVE_INFINITY, BigDecimal.NaN];
				}
				else {
					return [BigDecimal.NEGATIVE_INFINITY, BigDecimal.NaN];
				}
			}
			else {
				return [BigDecimal.ZERO, BigDecimal.NaN];
			}
		}
		else if(divisor.isZero()) {
			if(this.isZero()) {
				return [BigDecimal.NaN, BigDecimal.NaN];
			}
			else {
				return [this.sign() >= 0 ? BigDecimal.POSITIVE_INFINITY : BigDecimal.NEGATIVE_INFINITY, BigDecimal.NaN];
			}
		}
		// 1000e0		/	1e2				=	1000e-2	... 0e0
		// 1000e0		/	10e1			=	100e-1	... 0e0
		// 1000e0		/	100e0			=	10e0	... 0e0
		// 1000e0		/	1000e-1			=	1e1		... 0e0
		// 1000e0		/	10000e-2		=	1e1		... 0e-1
		// 1000e0		/	100000e-3		=	1e1		... 0e-2

		// 10e2			/	100e0			=	1e1		... 0e1
		// 100e1		/	100e0			=	1e1		... 0e1
		// 1000e0		/	100e0			=	10e0	... 0e0
		// 10000e-1		/	100e0			=	100e-1	... 0e-1
		// 100000e-2	/	100e0			=	1000e-2	... 0e-2

		const result_divide	= this.divideToIntegralValue(divisor);
		const result_remaind	= this.sub(result_divide.mul(divisor));

		const output = [result_divide, result_remaind];
		return output;
	}

	/**
	 * Remainder of division.
	 * - Result has same sign as the Dividend.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} A % B
	 */
	rem(number) {
		return this.divideAndRemainder(number)[1];
	}

	/**
	 * Modulo, positive remainder of division.
	 * - Result has same sign as the Divisor.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} A mod B
	 */
	mod(number) {
		const src = this;
		const tgt = BigDecimal._toBigDecimal(number);
		if(tgt.isZero()) {
			return src;
		}
		const x = src.rem(tgt);
		if(!src.equalsState(tgt)) {
			return x.add(tgt);
		}
		else {
			return x;
		}
	}

	/**
	 * Divide.
	 * - The argument can specify the scale after calculation.
	 * - In the case of precision infinity, it may generate an error by a repeating decimal.
	 * - When "{}" is specified for the argument, it is calculated on the scale of "this.scale() - divisor.scale()".
	 * - When null is specified for the argument, it is calculated on the scale of "divisor.context".
	 * @param {KBigDecimalInputData} number
	 * @param {MathContext|KBigDecimalDivideType} [type] - Scale, MathContext, RoundingMode used for the calculation.
	 * @returns {BigDecimal}
	 */
	div(number, type) {
		const divisor = BigDecimal._toBigDecimal(number);
		const src			= this;
		const tgt			= divisor;
		if(!src.isFinite() || !tgt.isFinite()) {
			if(src.isNaN() || tgt.isNaN() || (src.isInfinite() && tgt.isInfinite())) {
				return BigDecimal.NaN;
			}
			else if(src.isInfinite()) {
				if(src.sign() * tgt.sign() >= 0) {
					return BigDecimal.POSITIVE_INFINITY;
				}
				else {
					return BigDecimal.NEGATIVE_INFINITY;
				}
			}
			else {
				return BigDecimal.ZERO;
			}
		}
		else if(tgt.isZero()) {
			if(src.isZero()) {
				return BigDecimal.NaN;
			}
			else {
				return src.sign() >= 0 ? BigDecimal.POSITIVE_INFINITY : BigDecimal.NEGATIVE_INFINITY;
			}
		}
		let roundingMode	= null;
		let mc				= null;
		let newScale		= 0;
		let isPriorityScale	= false;

		// 設定をロードする
		if(!type) {
			mc = BigDecimal.getDefaultContext();
			roundingMode = mc.getRoundingMode();
			newScale = mc.getPrecision();
		}
		else if(type instanceof MathContext) {
			mc = type;
			roundingMode = mc.getRoundingMode();
			newScale = mc.getPrecision();
		}
		else {
			if(type && type.scale) {
				newScale = type.scale;
			}
			else {
				isPriorityScale	= true;
				if(type && (type.roundingMode || type.context)) {
					newScale = src.scale();
				}
				else {
					newScale = src.scale() - tgt.scale();
				}
			}
			if(type && type.context) {
				mc = type.context;
				roundingMode = mc.getRoundingMode();
				newScale = mc.getPrecision();
			}
			else {
				mc = this.context;
			}
			if(type && type.roundingMode) {
				roundingMode = type.roundingMode;
			}
			else {
				roundingMode = mc.getRoundingMode();
			}
		}
		
		if(tgt.compareTo(BigDecimal.ZERO) === 0) {
			throw "ArithmeticException";
		}

		const precision = mc.getPrecision();

		let all_result;
		// 無限精度か、精度が小さい場合は厳密に求める
		if((precision === 0) || (precision <= 100)) {
			let newsrc;
			/**
			 * @type {any}
			 */
			const result_map = {};
			let result, result_divide, result_remaind;
			all_result = BigDecimal.ZERO;
			const check_max = precision !== 0 ? (precision + 8) : 0x3FFFF;
			newsrc = src;
			BigDecimal.pushDefaultContext(MathContext.UNLIMITED);
			let is_error = false;
			let error_message;
			for(let i = 0; i < check_max; i++) {
				result = newsrc.divideAndRemainder(tgt);
				result_divide	= result[0];
				result_remaind	= result[1];
				all_result = all_result.add(result_divide.scaleByPowerOfTen(-i));
				if(!result_remaind.isZero()) {
					if(precision === 0) {	// 精度無限大の場合は、循環小数のチェックが必要
						if(result_map[result_remaind._getUnsignedIntegerString()]) {
							is_error = true;
							error_message = "ArithmeticException " + all_result + "[" + result_remaind._getUnsignedIntegerString() + "]";
							break;
						}
						else {
							result_map[result_remaind._getUnsignedIntegerString()] = true;
						}
					}
					newsrc = result_remaind.scaleByPowerOfTen(1);
				}
				else {
					break;
				}
			}
			BigDecimal.popDefaultContext();
			if(is_error) {
				throw error_message;
			}
		}
		else {
			// 巨大な値は繰り返しで求める
			BigDecimal.pushDefaultContext(new MathContext(precision + 4, RoundingMode.HALF_UP));
			all_result = this.mul(tgt.inv());
			BigDecimal.popDefaultContext();
		}
	
		all_result.context = mc;
		if(isPriorityScale) {
			// 優先スケールの場合は、スケールの変更に失敗する可能性あり
			try {
				all_result = all_result.setScale(newScale, roundingMode);
			}
			catch(e) {
				// falls through
			}
		}
		else {
			all_result = all_result.setScale(newScale, roundingMode);
		}
		all_result = all_result.round(BigDecimal.getDefaultContext());
		return all_result;
	}

	/**
	 * Inverse number of this value.
	 * @returns {BigDecimal} 1 / A
	 */
	inv() {
		if(BigDecimal.getDefaultContext().equals(MathContext.UNLIMITED)) {
			return BigDecimal.ONE.div(this);
		}
		{
			if(!this.isFinite()) {
				return this.isNaN() ? BigDecimal.NaN : BigDecimal.ZERO;
			}
			if(this.isZero()) {
				return BigDecimal.NaN;
			}
		}
		// 通常の割り算を行うと、「1」÷巨大な数を計算したときに、
		// 1 の仮数部の精度によってしまい、結果が0になってしまう場合がある
		// const mc = context ? context : this.context;
		// const b1 = this.createUsingThisSettings(1, mc);
		// return b1.div(this, mc);
		// 計算は絶対値を用いて行う
		const is_negative = this.isNegative();
		const A = !is_negative ? this: this.negate();
		// 3次のニュートン・ラフソン法で求める
		const B1 = BigDecimal.create(1);
		// 初期値は、指数部の情報を使用する
		const scale = - A.scale() + (A.precision() - 1);
		const x0 = new BigDecimal([1, scale + 1]);
		if(x0.isZero()) {
			return null;
		}
		let xn = x0;
		for(let i = 0; i < 20; i++) {
			const h = B1.sub(A.mul(xn));
			if(h.isZero()) {
				break;
			}
			xn = xn.mul(B1.add(h).add(h.square()));
		}
		// 参考
		// Lyuka - 逆数と平方根を求める高次収束アルゴリズム
		// http://www.finetune.co.jp/~lyuka/technote/fract/sqrt.html
		return !is_negative ? xn : xn.negate();
	}

	// ----------------------
	// その他の演算
	// ----------------------
	
	/**
	 * Factorial function, x!.
	 * - Supports only integers.
	 * @returns {BigDecimal} n!
	 */
	factorial() {
		if(!this.isFinite()) {
			return this;
		}
		const output = new BigDecimal((new BigInteger(this)).factorial());
		return output;
	}

	/**
	 * Multiply a multiple of ten.
	 * - Supports only integers.
	 * - Only the scale is changed without changing the precision.
	 * @param {KBigDecimalInputData} n 
	 * @returns {BigDecimal} A * 10^floor(n)
	 */
	scaleByPowerOfTen(n) {
		if(!this.isFinite()) {
			return this;
		}
		const x = BigDecimal._toInteger(n);
		const output = this.clone();
		output._scale = this.scale() - x;
		return output;
	}

	// ----------------------
	// 指数
	// ----------------------
	
	/**
	 * Power function.
	 * - An exception occurs when doing a huge multiplication.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} pow(A, B)
	 */
	pow(number) {
		const num = BigDecimal._toBigDecimal(number);
		const src = this;
		const tgt = num;
		{
			if(src.isNaN() || tgt.isNaN()) {
				return BigDecimal.NaN;
			}
			if(tgt.isZero()) {
				return BigDecimal.ONE;
			}
			else if(src.isZero()) {
				return BigDecimal.ZERO;
			}
			else if(src.isOne()) {
				return src;
			}
			else if(src.isInfinite()) {
				if(src.isPositiveInfinity()) {
					return BigDecimal.POSITIVE_INFINITY;
				}
				else {
					if(tgt.isPositiveInfinity()) {
						return BigDecimal.NaN;
					}
					else {
						return BigDecimal.create(Infinity * Math.pow(-1, Math.round(tgt.doubleValue)));
					}
				}
			}
			else if(tgt.isInfinite()) {
				if(src.isNegative()) {
					// 複素数
					return BigDecimal.NaN;
				}
				if(src.compareTo(BigDecimal.ONE) < 0) {
					if(tgt.isPositiveInfinity()) {
						return BigDecimal.ZERO;
					}
					else if(tgt.isNegativeInfinity()) {
						return BigDecimal.POSITIVE_INFINITY;
					}
				}
				else {
					if(tgt.isPositiveInfinity()) {
						return BigDecimal.POSITIVE_INFINITY;
					}
					else if(tgt.isNegativeInfinity()) {
						return BigDecimal.ZERO;
					}
				}
			}
		}
		const mc = BigDecimal.getDefaultContext();
		const integer = tgt.intValue;
		if(Math.abs(integer) > 1000) {
			throw BigDecimal.POSITIVE_INFINITY;
		}
		else if((mc.getPrecision() === 0) && (tgt.isNegative())) {
			return BigDecimal.NaN; // 複素数
		}
		if(tgt.isInteger()) {
			const is_negative = tgt.isNegative();
			let n = Math.round(Math.abs(integer));
			let x, y;
			x = this.clone();
			y = BigDecimal.ONE;
			BigDecimal.pushDefaultContext(MathContext.UNLIMITED);
			while(n !== 0) {
				if((n & 1) !== 0) {
					y = y.mul(x);
				}
				x = x.square();
				n >>>= 1;
			}
			BigDecimal.popDefaultContext();
			// コンテキストの状態が変わっているので元に戻す
			y.context = mc;
			if(is_negative) {
				y = y.inv();
			}
			y = y.round(mc);
			return y;
		}
		else {
			const mc = BigDecimal.getDefaultContext();
			BigDecimal.pushDefaultContext(BigDecimal.getDefaultContext().increasePrecision());
			const ret = this.log().mul(number).exp().round(mc);
			BigDecimal.popDefaultContext();
			return ret;
		}
	}
	
	/**
	 * Square.
	 * @returns {BigDecimal} A^2
	 */
	square() {
		return this.mul(this);
	}

	/**
	 * Square root.
	 * @returns {BigDecimal} sqrt(A)
	 */
	sqrt() {
		{
			if(this.isZero()) {
				return BigDecimal.ZERO;
			}
			else if(this.isNaN()) {
				return BigDecimal.NaN;
			}
			else if(this.isNegative()) {
				return BigDecimal.NaN; // 複素数
			}
			else if(this.isInfinite()) {
				return BigDecimal.POSITIVE_INFINITY;
			}
		}
		if(this.isZero()) {
			return BigDecimal.ZERO;
		}
		// ニュートンラフソン法は割り算があり速度が遅いので、以下の計算で求める。
		{
			const mc = BigDecimal.getDefaultContext();
			BigDecimal.pushDefaultContext(BigDecimal.getDefaultContext().increasePrecision());
			const ret = this.rsqrt().inv().round(mc);
			BigDecimal.popDefaultContext();
			return ret;
		}
	}

	/**
	 * Cube root.
	 * @returns {BigDecimal} cbrt(A)
	 */
	cbrt() {
		{
			if(this.isZero()) {
				return BigDecimal.ZERO;
			}
			else if(this.isNaN()) {
				return BigDecimal.NaN;
			}
			else if(this.isInfinite()) {
				return this;
			}
		}
		const scale = - this.scale() + (this.precision() - 1) + 1;
		const sign = this.sign();
		const abs = this.abs();
		let ret;
		// 小さい数値はpowを使ったほうが早く計算できる
		if(scale < 30) {
			const mc = BigDecimal.getDefaultContext();
			BigDecimal.pushDefaultContext(BigDecimal.getDefaultContext().increasePrecision());
			ret = abs.log().div(3).exp().round(mc);
			BigDecimal.popDefaultContext();
		}
		else {
			// ニュートン法によって求める
			// 参考：奥村晴彦 (1991). C言語による最新アルゴリズム事典.
			const x0 = abs.compareTo(BigDecimal.ONE) === 1 ? abs : BigDecimal.ONE;
			let xn = x0;
			for(let i = 0; i < 1000; i++) {
				const xn_2 = xn.mul(xn);
				const xn1 = xn.mul(2).add(abs.div(xn_2)).div(3);
				const delta = xn1.sub(xn);
				if(delta.isZero()) {
					break;
				}
				xn = xn1;
			}
			ret = xn;
		}
		return sign === 1 ? ret : ret.negate();
	}
	
	/**
	 * Reciprocal square root.
	 * @returns {BigDecimal} rsqrt(A)
	 */
	rsqrt() {
		{
			if(this.isZero()) {
				return BigDecimal.POSITIVE_INFINITY;
			}
			else if(this.isNaN()) {
				return BigDecimal.NaN;
			}
			else if(this.isInfinite()) {
				return BigDecimal.ZERO;
			}
			else if(this.isNegative()) {
				return BigDecimal.NaN; // 複素数
			}
		}
		/**
		 * @type {BigDecimal}
		 */
		const A = this;
		// 4次収束のニュートン・ラフソン法で求める
		// 使用する固定値を列挙
		const B1 = BigDecimal.create(1);
		const B5 = BigDecimal.create(5);
		const B6 = BigDecimal.create(6);
		const B8 = BigDecimal.create(8);
		const B16 = BigDecimal.create(16);
		const B16r = B16.inv();
		// 初期値
		const x0 = A.inv();
		if(x0.isZero()) {
			throw "ArithmeticException";
		}
		let xn = x0;
		for(let i = 0; i < 50; i++) {
			const h = B1.sub(A.mul(xn.square()));
			if(h.isZero()) {
				break;
			}
			xn = xn.mul(B1.add(h.mul(B8.add(h.mul(B6.add(B5.mul(h))))).mul(B16r)));
		}
		// 参考
		// Lyuka - 逆数と平方根を求める高次収束アルゴリズム
		// http://www.finetune.co.jp/~lyuka/technote/fract/sqrt.html
		return xn;
	}
	
	/**
	 * Logarithmic function.
	 * @returns {BigDecimal} log(A)
	 */
	log() {
		{
			if(this.isZero()) {
				return BigDecimal.NEGATIVE_INFINITY;
			}
			else if(this.isNaN()) {
				return BigDecimal.NaN;
			}
			else if(this.isNegative()) {
				return BigDecimal.NaN; // 複素数
			}
			else if(this.isInfinite()) {
				return BigDecimal.POSITIVE_INFINITY;
			}
		}
		if(this.isOne()) {
			return BigDecimal.ZERO;
		}
		const mc = BigDecimal.getDefaultContext();
		// log(x)
		// -> x = a * E -> log(a * E) = log(a) + log(E)
		// -> x = a / E -> log(a / E) = log(E) - log(a)
		// 上記の式を使用して、適切な値の範囲で計算できるように調整する
		const scale = - this.scale() + (this.precision() - 1) + 1;
		BigDecimal.pushDefaultContext(new MathContext(mc.getPrecision() + scale, RoundingMode.HALF_UP));
		/**
		 * @type {BigDecimal}
		 */
		let a = this;
		let b = 0;
		{
			// 範囲を 1 < x <= e の間に収める
			const e = BigDecimal.E;
			const compare_to_e = a.compareTo(e);
			if(compare_to_e === 0) {
				BigDecimal.popDefaultContext();
				return BigDecimal.ONE;
			}
			// 内部の値が大きすぎるので小さくする
			else if(compare_to_e > 0) {
				for(; b < 300; b++) {
					if(a.compareTo(e) <= 0) {
						break;
					}
					a = a.div(e);
				}
			}
			// 内部の値が小さすぎるので大きくする
			else {
				const B1 = new BigDecimal(1);
				if(a.compareTo(B1) < 0) {
					for(; b > -300; b--) {
						if(a.compareTo(B1) > 0) {
							break;
						}
						a = a.mul(e);
					}
				}
			}
		}
		BigDecimal.popDefaultContext();
		a = a.round(BigDecimal.getDefaultContext());
		// この時点で 1 < x <= e となる
		// log((1+u)/(1-u)) = 2 * (u + u^3/3 + u^5/5 + ...) の式を使用する
		// solve((1+u)/(1-u)-x=0,[u]);->u=(x-1)/(x+1)
		const u = a.sub(BigDecimal.ONE).div(a.add(BigDecimal.ONE));
		const u_x2 = u.mul(u);
		{
			// 初期値
			let x = u;
			let n0 = u;
			let k = BigDecimal.ONE;
			// 繰り返し求める
			for(let i = 0; i < 300; i++) {
				k = k.add(BigDecimal.TWO);
				x = x.mul(u_x2);
				const n1 = n0.add(x.div(k));
				const delta = n1.sub(n0);
				n0 = n1;
				if(delta.isZero()) {
					break;
				}
			}
			a = n0.mul(BigDecimal.TWO);
		}
		// 最終結果
		const y = a.add(b);
		return y;
	}

	/**
	 * Exponential function.
	 * @returns {BigDecimal} exp(A)
	 */
	exp() {
		{
			if(this.isZero()) {
				return BigDecimal.ONE;
			}
			else if(this.isNaN()) {
				return BigDecimal.NaN;
			}
			else if(this.isNegativeInfinity()) {
				return BigDecimal.ZERO;
			}
			else if(this.isPositiveInfinity()) {
				return BigDecimal.POSITIVE_INFINITY;
			}
		}
		const is_negative = this.isNegative();
		/**
		 * @type {BigDecimal}
		 */
		let number = this;
		// 負の値でマクローリン展開すると振動して桁落ちする可能性があるため正の値にしておく
		if(is_negative) {
			number = number.negate();
		}
		// X = exp(x) とすると X = exp(x/A)^A である。
		// そのため、収束を早くするためにexpの中を小さくしておき、最後にpowを行う。
		// scale > (10^a) = b ≒ this
		// 小さな値で計算するため精度をあげる
		const scale = - number.scale() + (number.precision() - 1) + 1;
		const mc = BigDecimal.getDefaultContext();
		BigDecimal.pushDefaultContext(new MathContext(mc.getPrecision() + scale, RoundingMode.HALF_UP));
		let a = 0;
		let b = 1;
		{
			const val = number.doubleValue;
			if(val >= 10) {
				a = Math.floor(Math.log(Math.floor(val)) / Math.log(10));
				b = Math.pow(10, a);
			}
		}
		// ここでターゲットの数値を割ってしまう
		const target = number.div(b, mc);
		// 小さくなった値に対してexpを計算する
		let y;
		{
			// マクローリン展開で計算する
			// 初期値
			let x = target;
			let n0 = BigDecimal.ONE.add(target);
			let k = BigDecimal.ONE;
			// 繰り返し求める
			for(let i = 2; i < 300; i++) {
				k = k.mul(i);
				x = x.mul(target);
				const n1 = n0.add(x.div(k));
				const delta = n1.sub(n0);
				n0 = n1;
				if(delta.isZero()) {
					break;
				}
			}
			y = n0;
		}
		// exp(x) = pow(y, b)である。
		y = y.pow(b);
		BigDecimal.popDefaultContext();
		y = y.round(BigDecimal.getDefaultContext());
		// 負の値だったら 1/(x^2) にして戻す
		if(is_negative) {
			return y.inv();
		}
		else {
			return y;
		}
	}

	/**
	 * e^x - 1
	 * @returns {BigDecimal} expm1(A)
	 */
	expm1() {
		return this.exp().sub(1);
	}

	/**
	 * ln(1 + x)
	 * @returns {BigDecimal} log1p(A)
	 */
	log1p() {
		return this.add(1).log();
	}
	
	/**
	 * log_2(x)
	 * @returns {BigDecimal} log2(A)
	 */
	log2() {
		return this.log().div(BigDecimal.LN2);
		
	}

	/**
	 * log_10(x)
	 * @returns {BigDecimal} log10(A)
	 */
	log10() {
		return this.log().div(BigDecimal.LN10);
	}
	
	// ----------------------
	// 三角関数
	// ----------------------

	/**
	 * Sine function.
	 * @returns {BigDecimal} sin(A)
	 */
	sin() {
		if(!this.isFinite()) {
			return BigDecimal.NaN;
		}
		// 2PIの余りを実際の計算で使用する。
		const scale = - this.scale() + (this.precision() - 1) + 1;
		const new_mc = new MathContext(BigDecimal.getDefaultContext().getPrecision() + scale, RoundingMode.HALF_UP);
		BigDecimal.pushDefaultContext(new_mc);
		const target = this.mod(BigDecimal.TWO_PI);
		BigDecimal.popDefaultContext();
		// マクローリン展開で計算する
		// 初期値
		let n0 = target;
		{
			const t_x2 = target.mul(target);
			let x = target;
			let k = BigDecimal.ONE;
			let sign = -1;
			// 繰り返し求める
			for(let i = 2; i < 300; i++) {
				k = k.mul(i);
				if((i % 2) === 1) {
					x = x.mul(t_x2);
					let n1;
					if(sign < 0) {
						n1 = n0.sub(x.div(k));
						sign = 1;
					}
					else {
						n1 = n0.add(x.div(k));
						sign = -1;
					}
					const delta = n1.sub(n0);
					n0 = n1;
					if(delta.isZero()) {
						break;
					}
				}
			}
		}
		return n0;
	}

	/**
	 * Cosine function.
	 * @returns {BigDecimal} cos(A)
	 */
	cos() {
		if(!this.isFinite()) {
			return BigDecimal.NaN;
		}
		const scale = - this.scale() + (this.precision() - 1) + 1;
		const new_mc = new MathContext(BigDecimal.getDefaultContext().getPrecision() + scale, RoundingMode.HALF_UP);
		BigDecimal.pushDefaultContext(new_mc);
		const target = this.mod(BigDecimal.TWO_PI);
		BigDecimal.popDefaultContext();
		// マクローリン展開で計算する
		// 初期値
		let n0 = BigDecimal.ONE;
		{
			let x = BigDecimal.ONE;
			const t_x2 = target.mul(target);
			let k = BigDecimal.ONE;
			let sign = -1;
			// 繰り返し求める
			for(let i = 2; i < 300; i++) {
				k = k.mul(i);
				if((i % 2) === 0) {
					x = x.mul(t_x2);
					let n1;
					if(sign < 0) {
						n1 = n0.sub(x.div(k));
						sign = 1;
					}
					else {
						n1 = n0.add(x.div(k));
						sign = -1;
					}
					const delta = n1.sub(n0);
					n0 = n1;
					if(delta.isZero()) {
						break;
					}
				}
			}
		}
		return n0;
	}

	/**
	 * Tangent function.
	 * @returns {BigDecimal} tan(A)
	 */
	tan() {
		if(!this.isFinite()) {
			return BigDecimal.NaN;
		}
		return this.sin().div(this.cos());
	}

	/**
	 * Atan (arc tangent) function.
	 * - Return the values of [-PI/2, PI/2].
	 * @returns {BigDecimal} atan(A)
	 */
	atan() {
		if(!this.isFinite()) {
			if(this.isNaN()) {
				return BigDecimal.NaN;
			}
			else if(this.isPositiveInfinity()) {
				return BigDecimal.HALF_PI;
			}
			else {
				return BigDecimal.HALF_PI.negate();
			}
		}
		if(this.isZero()) {
			const y = BigDecimal.ZERO;
			return y;
		}
		else if(this.compareTo(BigDecimal.ONE) === 0) {
			const y = BigDecimal.QUARTER_PI;
			return y;
		}
		else if(this.compareTo(BigDecimal.MINUS_ONE) === 0) {
			const y = BigDecimal.QUARTER_PI.negate();
			return y;
		}
		// x を 0 <= x <= 0.5 に収める
		const target_sign = this.sign();
		let target = this.abs();
		let type;
		if(target.compareTo(BigDecimal.TWO) === 1) {
			// atan(x) = pi/2-atan(1/x)
			type = 1;
			target = target.inv();
		}
		else if(target.compareTo(BigDecimal.HALF) === 1) {
			// atan(x) = pi/4-atan((1-x)/(1+x))
			type = 2;
			target = BigDecimal.ONE.sub(target).div(BigDecimal.ONE.add(target));
		}
		else {
			type = 3;
		}
		// グレゴリー級数
		// 初期値
		let n0 = target;
		{
			const t_x2 = target.mul(target);
			let x = target;
			let k = BigDecimal.ONE;
			let sign = -1;
			// 繰り返し求める
			for(let i = 0; i < 300; i++) {
				x = x.mul(t_x2);
				k = k.add(BigDecimal.TWO);
				let n1;
				if(sign < 0) {
					n1 = n0.sub(x.div(k));
					sign = 1;
				}
				else {
					n1 = n0.add(x.div(k));
					sign = -1;
				}
				const delta = n1.sub(n0);
				n0 = n1;
				if(delta.isZero()) {
					break;
				}
			}
		}
		if(type === 1) {
			n0 = BigDecimal.HALF_PI.sub(n0);
		}
		else if(type === 2) {
			n0 = BigDecimal.QUARTER_PI.sub(n0);
		}
		if(target_sign < 0) {
			n0 = n0.negate();
		}
		return n0;
	}

	/**
	 * Atan (arc tangent) function.
	 * Return the values of [-PI, PI] .
	 * Supports only real numbers.
	 * @param {KBigDecimalInputData} number 
	 * @param {MathContext} [context] - MathContext setting after calculation. If omitted, use the MathContext of the B.
	 * @returns {BigDecimal} atan2(Y, X)
	 */
	atan2(number, context) {
		const default_context = BigDecimal.getDefaultContext();
		// y.atan2(x) とする。
		const y = this.round(context);
		const x = new BigDecimal([number, context]);
		if(x.isNaN() || y.isNaN()) {
			return BigDecimal.NaN;
		}
		// 参考: https://en.wikipedia.org/wiki/Inverse_trigonometric_functions
		let ret;
		if(x.isPositive()) {
			ret = y.div(x).atan();
		}
		else if(y.isNotNegative() && x.isNegative()) {
			ret = y.div(x).atan().add(BigDecimal.PI);
		}
		else if(y.isNegative() && x.isNegative()) {
			ret = y.div(x).atan().sub(BigDecimal.PI);
		}
		else if(y.isPositive()) {
			ret = BigDecimal.HALF_PI;
		}
		else if(y.isNegative()) {
			ret = BigDecimal.HALF_PI.negate();
		}
		else {
			throw "ArithmeticException";
		}
		BigDecimal.setDefaultContext(default_context);
		return ret;
	}

	// ----------------------
	// 双曲線関数
	// ----------------------
	
	/**
	 * Arc sine function.
	 * @returns {BigDecimal} asin(A)
	 */
	asin() {
		// 逆正弦
		// 複素数
		const re_1 = this.square().negate().add(1).sqrt();
		const im_1 = this;
		// 複素数のログ
		const norm = re_1.square().add(im_1.square()).sqrt();
		const arg  = im_1.atan2(re_1);
		const re_2 = norm.log();
		const im_2 = arg;
		// -i を掛け算する
		return re_2.add(im_2);
	}

	/**
	 * Arc cosine function.
	 * @returns {BigDecimal} acos(A)
	 */
	acos() {
		// 逆余弦
		// 複素数
		const re_1 = this;
		const im_1 = this.square().negate().add(1).sqrt();
		// 複素数のログ
		const norm = re_1.square().add(im_1.square()).sqrt();
		const arg  = im_1.atan2(re_1);
		const re_2 = norm.log();
		const im_2 = arg;
		// -i を掛け算する
		return re_2.add(im_2);
	}
	

	/**
	 * Hyperbolic sine function.
	 * @returns {BigDecimal} sinh(A)
	 */
	sinh() {
		// 双曲線正弦
		if(this.isInfinite()) {
			return this;
		}
		const y = this.exp();
		return y.sub(y.inv()).mul(0.5);
	}

	/**
	 * Inverse hyperbolic sine function.
	 * @returns {BigDecimal} asinh(A)
	 */
	asinh() {
		if(this.isInfinite()) {
			return this;
		}
		return this.add(this.mul(this).add(1).sqrt()).log();
	}

	/**
	 * Hyperbolic cosine function.
	 * @returns {BigDecimal} cosh(A)
	 */
	cosh() {
		// 双曲線余弦
		if(this.isInfinite()) {
			return BigDecimal.POSITIVE_INFINITY;
		}
		return this.exp().add(this.negate().exp()).mul(0.5);
	}

	/**
	 * Inverse hyperbolic cosine function.
	 * @returns {BigDecimal} acosh(A)
	 */
	acosh() {
		// 逆双曲線余弦 Math.log(x + Math.sqrt(x * x - 1));
		if(this.isInfinite()) {
			return BigDecimal.NaN;
		}
		return this.add(this.mul(this).sub(1).sqrt()).log();
	}

	/**
	 * Hyperbolic tangent function.
	 * @returns {BigDecimal} tanh(A)
	 */
	tanh() {
		// 双曲線正接
		if(this.isInfinite()) {
			return BigDecimal.create(this.sign());
		}
		const y =  this.mul(2).exp();
		return y.sub(1).div(y.add(1));
	}
	
	/**
	 * Inverse hyperbolic tangent function.
	 * @returns {BigDecimal} atanh(A)
	 */
	atanh() {
		// 逆双曲線正接
		return this.add(1).div(this.negate().add(1)).log().mul(0.5);
	}

	/**
	 * Secant function.
	 * @returns {BigDecimal} sec(A)
	 */
	sec() {
		// 正割
		return this.cos().inv();
	}

	/**
	 * Reverse secant function.
	 * @returns {BigDecimal} asec(A)
	 */
	asec() {
		// 逆正割
		return this.inv().acos();
	}

	/**
	 * Hyperbolic secant function.
	 * @returns {BigDecimal} sech(A)
	 */
	sech() {
		// 双曲線正割
		if(this.isNegativeInfinity()) {
			return BigDecimal.ZERO;
		}
		return this.exp().add(this.negate().exp()).inv().mul(2);
	}

	/**
	 * Inverse hyperbolic secant function.
	 * @returns {BigDecimal} asech(A)
	 */
	asech() {
		// 逆双曲線正割
		return this.inv().add(this.square().inv().sub(1).sqrt()).log();
	}

	/**
	 * Cotangent function.
	 * @returns {BigDecimal} cot(A)
	 */
	cot() {
		// 余接
		if(this.isZero()) {
			return BigDecimal.POSITIVE_INFINITY;
		}
		return this.tan().inv();
	}

	/**
	 * Inverse cotangent function.
	 * @returns {BigDecimal} acot(A)
	 */
	acot() {
		// 逆余接
		if(this.isZero()) {
			return BigDecimal.HALF_PI;
		}
		return this.inv().atan();
	}

	/**
	 * Hyperbolic cotangent function.
	 * @returns {BigDecimal} coth(A)
	 */
	coth() {
		// 双曲線余接
		if(this.isInfinite()) {
			return BigDecimal.create(this.sign());
		}
		const y =  this.mul(2).exp();
		return y.add(1).div(y.sub(1));
	}

	/**
	 * Inverse hyperbolic cotangent function.
	 * @returns {BigDecimal} acoth(A)
	 */
	acoth() {
		// 逆双曲線余接
		if(this.isInfinite()) {
			return BigDecimal.ZERO;
		}
		return this.add(1).div(this.sub(1)).log().mul(0.5);
	}

	/**
	 * Cosecant function.
	 * @returns {BigDecimal} csc(A)
	 */
	csc() {
		// 余割
		if(this.isZero()) {
			return BigDecimal.POSITIVE_INFINITY;
		}
		return this.sin().inv();
	}

	/**
	 * Inverse cosecant function.
	 * @returns {BigDecimal} acsc(A)
	 */
	acsc() {
		// 逆余割
		return this.inv().asin();
	}

	/**
	 * Hyperbolic cosecant function.
	 * @returns {BigDecimal} csch(A)
	 */
	csch() {
		if(this.isInfinite()) {
			return BigDecimal.ZERO;
		}
		else if(this.isZero()) {
			return BigDecimal.POSITIVE_INFINITY;
		}
		// 双曲線余割
		return this.exp().sub(this.negate().exp()).inv().mul(2);
	}

	/**
	 * Inverse hyperbolic cosecant function.
	 * @returns {BigDecimal} acsch(A)
	 */
	acsch() {
		if(this.isZero()) {
			return BigDecimal.POSITIVE_INFINITY;
		}
		// 逆双曲線余割
		return this.inv().add(this.square().inv().add(1).sqrt()).log();
	}

	// ----------------------
	// 確率・統計系
	// ----------------------
	
	/**
	 * Logit function.
	 * @returns {BigDecimal} logit(A)
	 */
	logit() {
		return this.log().sub(BigDecimal.ONE.sub(this).log());
	}

	// ----------------------
	// 信号処理系
	// ----------------------
	
	/**
	 * Normalized sinc function.
	 * @returns {BigDecimal} sinc(A)
	 */
	sinc() {
		if(this.isZero()) {
			return(BigDecimal.ONE);
		}
		const x = BigDecimal.PI.mul(this);
		return x.sin().div(x);
	}

	// ----------------------
	// 乱数
	// ----------------------
	
	/**
	 * Create random values with uniform random numbers.
	 * @param {Random} [random] - Class for creating random numbers.
	 * @returns {BigDecimal}
	 */
	static rand(random) {
		let precision = BigDecimal.getDefaultContext().getPrecision();
		if(precision <= 0) {
			precision = 100;
		}
		const keta = Math.ceil(precision * Math.log(10) / Math.log(2));
		const a = BigInteger.ONE.shiftLeft(keta);
		const b = BigInteger.createRandomBigInteger(keta, random);
		return (new BigDecimal(b)).div(a);
	}

	/**
	 * Create random values with normal distribution.
	 * @param {Random} [random] - Class for creating random numbers.
	 * @returns {BigDecimal}
	 */
	static randn(random) {
		// Box-Muller法
		const a = BigDecimal.rand(random).log().mul(-2).sqrt();
		const b = BigDecimal.rand(random).mul(2).mul(BigDecimal.PI);
		const y = a.mul(b.sin());
		return y;
	}

	// ----------------------
	// テスト系
	// ----------------------
	
	/**
	 * Return true if the value is integer.
	 * @param {KBigDecimalInputData} [tolerance=0] - Calculation tolerance of calculation.
	 * @returns {boolean}
	 */
	isInteger(tolerance) {
		if(!this.isFinite()) {
			return false;
		}
		return this.sub(this.fix()).isZero(tolerance);
	}

	/**
	 * this === 0
	 * @param {KBigDecimalInputData} [tolerance=0] - Calculation tolerance of calculation.
	 * @returns {boolean}
	 */
	isZero(tolerance) {
		if(!this.isFinite()) {
			return false;
		}
		if(tolerance) {
			return this.equals(BigDecimal.ZERO, tolerance);
		}
		else {
			return this.integer.isZero();
		}
	}
	
	/**
	 * this === 1
	 * @param {KBigDecimalInputData} [tolerance=0] - Calculation tolerance of calculation.
	 * @returns {boolean}
	 */
	isOne(tolerance) {
		if(!this.isFinite()) {
			return false;
		}
		return this.compareTo(BigDecimal.ONE, tolerance) === 0;
	}

	/**
	 * this > 0
	 * @returns {boolean}
	 */
	isPositive() {
		return this.integer.isPositive();
	}

	/**
	 * this < 0
	 * @returns {boolean}
	 */
	isNegative() {
		return this.integer.isNegative();
	}

	/**
	 * this >= 0
	 * @returns {boolean}
	 */
	isNotNegative() {
		return this.integer.isNotNegative();
	}
	
	/**
	 * this === NaN
	 * @returns {boolean} isNaN(A)
	 */
	isNaN() {
		return this.integer.isNaN();
	}
	
	/**
	 * this === Infinity
	 * @returns {boolean} isPositiveInfinity(A)
	 */
	isPositiveInfinity() {
		return this.integer.isPositiveInfinity();
	}

	/**
	 * this === -Infinity
	 * @returns {boolean} isNegativeInfinity(A)
	 */
	isNegativeInfinity() {
		return this.integer.isNegativeInfinity();
	}

	/**
	 * this === Infinity or -Infinity
	 * @returns {boolean} isPositiveInfinity(A) || isNegativeInfinity(A)
	 */
	isInfinite() {
		return this.integer.isInfinite();
	}
	
	/**
	 * Return true if the value is finite number.
	 * @returns {boolean} !isNaN(A) && !isInfinite(A)
	 */
	isFinite() {
		return this.integer.isFinite();
	}

	// ----------------------
	// ビット演算系
	// ----------------------
	
	/**
	 * Logical AND.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} A & B
	 */
	and(number) {
		const n_src = this;
		const n_tgt = BigDecimal._toBigDecimal(number);
		const src	= n_src.round().toBigInteger();
		const tgt	= n_tgt.round().toBigInteger();
		return new BigDecimal(src.and(tgt));
	}

	/**
	 * Logical OR.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} A | B
	 */
	or(number) {
		const n_src = this;
		const n_tgt = BigDecimal._toBigDecimal(number);
		const src	= n_src.round().toBigInteger();
		const tgt	= n_tgt.round().toBigInteger();
		return new BigDecimal(src.or(tgt));
	}

	/**
	 * Logical Exclusive-OR.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} A ^ B
	 */
	xor(number) {
		const n_src = this;
		const n_tgt = BigDecimal._toBigDecimal(number);
		const src	= n_src.round().toBigInteger();
		const tgt	= n_tgt.round().toBigInteger();
		return new BigDecimal(src.xor(tgt));
	}

	/**
	 * Logical Not. (mutable)
	 * - Calculated as an integer.
	 * @returns {BigDecimal} !A
	 */
	not() {
		const n_src = this;
		const src	= n_src.round().toBigInteger();
		return new BigDecimal(src.not());
	}
	
	/**
	 * this << n
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} n
	 * @returns {BigDecimal} A << n
	 */
	shift(n) {
		const src		= this.round().toBigInteger();
		const number	= BigDecimal._toInteger(n);
		return new BigDecimal(src.shift(number));
	}

	// ----------------------
	// factor
	// ----------------------

	/**
	 * Factorization.
	 * - Calculated as an integer.
	 * - Calculate up to `9007199254740991`.
	 * @returns {BigDecimal[]} factor
	 */
	factor() {
		const x = this.round().toBigInteger().factor();
		const y = [];
		for(let i = 0; i < x.length; i++) {
			y.push(new BigDecimal(x[i]));
		}
		return y;
	}

	// ----------------------
	// gcd, lcm
	// ----------------------
	
	/**
	 * Euclidean algorithm.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} gcd(x, y)
	 */
	gcd(number) {
		const x = this.round().toBigInteger();
		const y = BigDecimal._toBigDecimal(number).toBigInteger();
		const result = x.gcd(y);
		return new BigDecimal(result);
	}

	/**
	 * Extended Euclidean algorithm.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} number 
	 * @returns {Array<BigDecimal>} [a, b, gcd(x, y)], Result of calculating a*x + b*y = gcd(x, y).
	 */
	extgcd(number) {
		const x = this.round().toBigInteger();
		const y = BigDecimal._toBigDecimal(number).toBigInteger();
		const result = x.extgcd(y);
		return [new BigDecimal(result[0]), new BigDecimal(result[1]), new BigDecimal(result[2])];
	}

	/**
	 * Least common multiple.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} lcm(x, y)
	 */
	lcm(number) {
		const x = this.round().toBigInteger();
		const y = BigDecimal._toBigDecimal(number).toBigInteger();
		const result = x.lcm(y);
		return new BigDecimal(result);
	}

	// ----------------------
	// mod
	// ----------------------

	/**
	 * Modular exponentiation.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} exponent
	 * @param {KBigDecimalInputData} m 
	 * @returns {BigDecimal} A^B mod m
	 */
	modPow(exponent, m) {
		const A = this.round().toBigInteger();
		const B = BigDecimal._toBigDecimal(exponent).toBigInteger();
		const m_ = BigDecimal._toBigDecimal(m).toBigInteger();
		const result = A.modPow(B, m_);
		return new BigDecimal(result);
	}

	/**
	 * Modular multiplicative inverse.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} m
	 * @returns {BigDecimal} A^(-1) mod m
	 */
	modInverse(m) {
		const A = this.round().toBigInteger();
		const m_ = BigDecimal._toBigDecimal(m).toBigInteger();
		const result = A.modInverse(m_);
		return new BigDecimal(result);
	}
	
	// ----------------------
	// 素数
	// ----------------------
	
	/**
	 * Return true if the value is prime number.
	 * - Calculated as an integer.
	 * - Calculate up to `2251799813685248(=2^51)`.
	 * @returns {boolean} - If the calculation range is exceeded, null is returned.
	 */
	isPrime() {
		const src = this.round().toBigInteger();
		return src.isPrime();
	}
	
	/**
	 * Return true if the value is prime number by Miller-Labin prime number determination method.
	 * 
	 * Attention : it takes a very long time to process.
	 * - Calculated as an integer.
	 * @param {KBigDecimalInputData} [certainty=100] - Repeat count (prime precision).
	 * @returns {boolean}
	 */
	isProbablePrime(certainty) {
		const src = this.round().toBigInteger();
		return src.isProbablePrime(certainty !== undefined ? BigDecimal._toInteger(certainty) : undefined);
	}

	/**
	 * Next prime.
	 * @param {KBigDecimalInputData} [certainty=100] - Repeat count (prime precision).
	 * @param {KBigDecimalInputData} [search_max=100000] - Search range of next prime.
	 * @returns {BigDecimal}
	 */
	nextProbablePrime(certainty, search_max) {
		const src = this.round().toBigInteger();
		const p1 = certainty !== undefined ? BigDecimal._toInteger(certainty) : undefined;
		const p2 = search_max !== undefined ? BigDecimal._toInteger(search_max) : undefined;
		return BigDecimal.create(src.nextProbablePrime(p1, p2));
	}

	// ----------------------
	// 定数
	// ----------------------
	
	/**
	 * -1
	 * @returns {BigDecimal} -1
	 */
	static get MINUS_ONE() {
		return CACHED_DATA.MINUS_ONE.get();
	}

	/**
	 * 0
	 * @returns {BigDecimal} 0
	 */
	static get ZERO() {
		return CACHED_DATA.ZERO.get();
	}
	
	/**
	 * 0.5
	 * @returns {BigDecimal} 0.5
	 */
	static get HALF() {
		return CACHED_DATA.HALF.get();
	}
	
	/**
	 * 1
	 * @returns {BigDecimal} 1
	 */
	static get ONE() {
		return CACHED_DATA.ONE.get();
	}
	
	/**
	 * 2
	 * @returns {BigDecimal} 2
	 */
	static get TWO() {
		return CACHED_DATA.TWO.get();
	}
	
	/**
	 * 10
	 * @returns {BigDecimal} 10
	 */
	static get TEN() {
		return CACHED_DATA.TEN.get();
	}

	/**
	 * PI
	 * @returns {BigDecimal} 3.14...
	 */
	static get PI() {
		return CACHED_DATA.PI.get();
	}

	/**
	 * 0.25 * PI.
	 * @returns {BigDecimal} 0.78...
	 */
	static get QUARTER_PI() {
		return CACHED_DATA.QUARTER_PI.get();
	}

	/**
	 * 0.5 * PI.
	 * @returns {BigDecimal} 1.57...
	 */
	static get HALF_PI() {
		return CACHED_DATA.HALF_PI.get();
	}

	/**
	 * 2 * PI.
	 * @returns {BigDecimal} 6.28...
	 */
	static get TWO_PI() {
		return CACHED_DATA.TWO_PI.get();
	}

	/**
	 * E, Napier's constant.
	 * @returns {BigDecimal} E
	 */
	static get E() {
		return CACHED_DATA.E.get();
	}

	/**
	 * log_e(2)
	 * @returns {BigDecimal} ln(2)
	 */
	static get LN2() {
		return CACHED_DATA.LN2.get();
	}

	/**
	 * log_e(10)
	 * @returns {BigDecimal} ln(10)
	 */
	static get LN10() {
		return CACHED_DATA.LN10.get();
	}

	/**
	 * log_2(e)
	 * @returns {BigDecimal} log_2(e)
	 */
	static get LOG2E() {
		return CACHED_DATA.LOG2E.get();
	}
	
	/**
	 * log_10(e)
	 * @returns {BigDecimal} log_10(e)
	 */
	static get LOG10E() {
		return CACHED_DATA.LOG10E.get();
	}
	
	/**
	 * sqrt(2)
	 * @returns {BigDecimal} sqrt(2)
	 */
	static get SQRT2() {
		return CACHED_DATA.SQRT2.get();
	}
	
	/**
	 * sqrt(0.5)
	 * @returns {BigDecimal} sqrt(0.5)
	 */
	static get SQRT1_2() {
		return CACHED_DATA.SQRT1_2.get();
	}

	/**
	 * Positive infinity.
	 * @returns {BigDecimal} Infinity
	 */
	static get POSITIVE_INFINITY() {
		if(DEFINE.POSITIVE_INFINITY === null) {
			DEFINE.POSITIVE_INFINITY = new BigDecimal(Number.POSITIVE_INFINITY);
		}
		return DEFINE.POSITIVE_INFINITY;
	}
	
	/**
	 * Negative Infinity.
	 * @returns {BigDecimal} -Infinity
	 */
	static get NEGATIVE_INFINITY() {
		if(DEFINE.NEGATIVE_INFINITY === null) {
			DEFINE.NEGATIVE_INFINITY = new BigDecimal(Number.NEGATIVE_INFINITY);
		}
		return DEFINE.NEGATIVE_INFINITY;
	}

	/**
	 * Not a Number.
	 * @returns {BigDecimal} NaN
	 */
	static get NaN() {
		if(DEFINE.NaN === null) {
			DEFINE.NaN = new BigDecimal(Number.NaN);
		}
		return DEFINE.NaN;
	}

	// ----------------------
	// 互換性
	// ----------------------
	
	/**
	 * The positive or negative sign of this number.
	 * - +1 if positive, -1 if negative, 0 if 0.
	 * @returns {number}
	 */
	signum() {
		return this.sign();
	}

	/**
	 * Subtract.
	 * @param {KBigDecimalInputData} number 
	 * @returns {BigDecimal} A - B
	 */
	subtract(number) {
		return this.sub(number);
	}

	/**
	 * Multiply.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} A * B
	 */
	multiply(number) {
		return this.mul(number);
	}

	/**
	 * Divide.
	 * - The argument can specify the scale after calculation.
	 * - In the case of precision infinity, it may generate an error by a repeating decimal.
	 * - When "{}" is specified for the argument, it is calculated on the scale of "this.scale() - divisor.scale()".
	 * - When null is specified for the argument, it is calculated on the scale of "divisor.context".
	 * @param {KBigDecimalInputData} number
	 * @param {MathContext|KBigDecimalDivideType} [type] - Scale, MathContext, RoundingMode used for the calculation.
	 * @returns {BigDecimal} A / B
	 */
	divide(number, type) {
		return this.div(number, type);
	}

	/**
	 * Remainder of division.
	 * - Result has same sign as the Dividend.
	 * @param {KBigDecimalInputData} number
	 * @returns {BigDecimal} A % B
	 */
	remainder(number) {
		return this.rem(number);
	}
	
	/**
	 * To integer rounded down to the nearest.
	 * @returns {BigDecimal} fix(A), trunc(A)
	 */
	trunc() {
		return this.fix();
	}

}

BigDecimal.RoundingMode = RoundingMode;
BigDecimal.MathContext = MathContext;

/**
 * Collection of constant values used in the class.
 * @ignore
 */
const DEFINE = {

	/**
	 * -1
	 * @returns {BigDecimal} -1
	 */
	MINUS_ONE : function() {
		return new BigDecimal(-1);
	},

	/**
	 * 0
	 * @returns {BigDecimal} 0
	 */
	ZERO : function() {
		return new BigDecimal(0);
	},
	
	/**
	 * 0.5
	 * @returns {BigDecimal} 0.5
	 */
	HALF : function() {
		return new BigDecimal(0.5);
	},
	
	/**
	 * 1
	 * @returns {BigDecimal} 1
	 */
	ONE : function() {
		return new BigDecimal(1);
	},
	
	/**
	 * 2
	 * @returns {BigDecimal} 2
	 */
	TWO : function() {
		return new BigDecimal(2);
	},
	
	/**
	 * 10
	 * @returns {BigDecimal} 10
	 */
	TEN : function() {
		return new BigDecimal(10);
	},

	/**
	 * PI
	 * @returns {BigDecimal} 3.14...
	 */
	PI : function() {
		// DECIMAL256 でも精度は72桁ほどである。
		// 従って、79桁のPIをすでにデータとして持っておく。
		const PI79 = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862";
		const context = BigDecimal.getDefaultContext();
		if(context.getPrecision() <= 78) {
			return new BigDecimal(PI79).round(context);
		}
		else {
			// ガウス＝ルジャンドルのアルゴリズム
			// 使用する固定値を列挙
			const B1		= BigDecimal.create(1);
			const B2		= BigDecimal.create(2);
			const B4		= BigDecimal.create(4);
			// 初期値
			let a = B1;
			let b = B2.sqrt().inv();
			let t = B4.inv();
			let p = B1;
			let pi = B1;
			// 繰り返し求める
			for(let i = 0; i < 10; i++) {
				const a1 = a.add(b).div(B2);
				const b1 = a.mul(b).sqrt();
				const t1 = t.sub(p.mul(a.sub(a1).square()));
				const p1 = p.mul(B2);
				const pi1 = a1.add(b1).square().div(t1.mul(B4));
				const delta = pi1.sub(pi);
				pi = pi1;
				if(delta.isZero()) {
					break;
				}
				a = a1;
				b = b1;
				t = t1;
				p = p1;
			}
			return pi;
		}
	},

	/**
	 * 0.25 * PI.
	 * @returns {BigDecimal} 0.78...
	 */
	QUARTER_PI : function() {
		return DEFINE.PI().div(4);
	},

	/**
	 * 0.5 * PI.
	 * @returns {BigDecimal} 1.57...
	 */
	HALF_PI : function() {
		return DEFINE.PI().div(2);
	},

	/**
	 * 2 * PI.
	 * @returns {BigDecimal} 6.28...
	 */
	TWO_PI : function() {
		return DEFINE.PI().mul(2);
	},
	
	/**
	 * E, Napier's constant.
	 * @returns {BigDecimal} E
	 */
	E : function() {
		// DECIMAL256 でも精度は72桁ほどである。
		// 従って、84桁のEをすでにデータとして持っておく。
		const E84 = "2.71828182845904523536028747135266249775724709369995957496696762772407663035354759";
		const context = BigDecimal.getDefaultContext();
		if(context.getPrecision() <= 83) {
			return new BigDecimal(E84).round(context);
		}
		else {
			// 初期値
			let n0 = BigDecimal.create(2);
			let k = BigDecimal.create(1);
			// 繰り返し求める
			for(let i = 2; i < 300; i++) {
				k = k.mul(i);
				const n1 = n0.add(k.inv());
				const delta = n1.sub(n0);
				n0 = n1;
				if(delta.isZero()) {
					break;
				}
			}
			return n0;
		}
	},

	/**
	 * log_e(2)
	 * @returns {BigDecimal} ln(2)
	 */
	LN2 : function() {
		return (new BigDecimal(2)).log();
	},

	/**
	 * log_e(10)
	 * @returns {BigDecimal} ln(10)
	 */
	LN10 : function() {
		return (new BigDecimal(10)).log();
	},

	/**
	 * log_2(e)
	 * @returns {BigDecimal} log_2(e)
	 */
	LOG2E : function() {
		return (new BigDecimal(2)).log().inv();
	},
	
	/**
	 * log_10(e)
	 * @returns {BigDecimal} log_10(e)
	 */
	LOG10E : function() {
		return (new BigDecimal(10)).log().inv();
	},
	
	/**
	 * sqrt(2)
	 * @returns {BigDecimal} sqrt(2)
	 */
	SQRT2 : function() {
		return (new BigDecimal(2)).sqrt();
	},
	
	/**
	 * sqrt(0.5)
	 * @returns {BigDecimal} sqrt(0.5)
	 */
	SQRT1_2 : function() {
		return (new BigDecimal(0.5)).sqrt();
	},
	
	/**
	 * Positive infinity.
	 * @type {any}
	 */
	POSITIVE_INFINITY : null,

	/**
	 * Negative Infinity.
	 * @type {any}
	 */
	NEGATIVE_INFINITY : null,

	/**
	 * Not a Number.
	 * @type {any}
	 */
	NaN : null
	
};

/**
 * Simple cache class.
 * @ignore
 */
class BigDecimalCache {
	
	/**
	 * Create Cache.
	 * @param {string} method_name - Method name in the DEFINE.
	 * @param {number} cache_size - Maximum number of caches.
	 */
	constructor(method_name, cache_size) {

		/**
		 * Method name in the DEFINE.
		 * @type {string}
		 */
		this.method_name = method_name;
		
		/**
		 * @type {Array<{name:string, number:BigDecimal}>}
		 */
		this.table = [];

		/**
		 * Maximum number of caches.
		 * @type {number}
		 */
		this.table_max = cache_size;

	}

	/**
	 * Use from cache if it exists in cache.
	 * @returns {BigDecimal}
	 */
	get() {
		const name = BigDecimal.getDefaultContext().toString();

		for(let index = 0; index < this.table.length; index++) {
			if(this.table[index].name === name) {
				// 先頭にもってくる
				const object = this.table.splice(index, 1)[0];
				this.table.unshift(object);
				return object.number;
			}
		}
		// @ts-ignore
		const new_number = DEFINE[this.method_name]();
		if(this.table.length === this.table_max) {
			// 後ろのデータを消去
			this.table.pop();
		}
		// 前方に追加
		this.table.unshift({
			name : name,
			number : new_number
		});
		return new_number;
	}

}

/**
 * Simple cache class.
 * @ignore
 */
class BigDecimalConst {
	/**
	 * Constructor
	 */
	constructor() {
		/**
		 * -1
		 */
		this.MINUS_ONE = new BigDecimalCache("MINUS_ONE", 10);

		/**
		 * 0
		 */
		this.ZERO = new BigDecimalCache("ZERO", 10);

		/**
		 * 0.5
		 */
		this.HALF = new BigDecimalCache("HALF", 10);

		/**
		 * 1
		 */
		this.ONE = new BigDecimalCache("ONE", 10);

		/**
		 * 2
		 */
		this.TWO = new BigDecimalCache("TWO", 10);

		/**
		 * 10
		 */
		this.TEN = new BigDecimalCache("TEN", 10);

		/**
		 * PI
		 */
		this.PI = new BigDecimalCache("PI", 10);

		/**
		 * QUARTER_PI
		 */
		this.QUARTER_PI = new BigDecimalCache("QUARTER_PI", 10);

		/**
		 * HALF_PI
		 */
		this.HALF_PI = new BigDecimalCache("HALF_PI", 10);

		/**
		 * TWO_PI
		 */
		this.TWO_PI = new BigDecimalCache("TWO_PI", 10);

		/**
		 * E
		 */
		this.E = new BigDecimalCache("E", 10);

		/**
		 * LN2
		 */
		this.LN2 = new BigDecimalCache("LN2", 10);

		/**
		 * LN10
		 */
		this.LN10 = new BigDecimalCache("LN10", 10);

		/**
		 * LOG2E
		 */
		this.LOG2E = new BigDecimalCache("LOG2E", 10);
		
		/**
		 * LOG10E
		 */
		this.LOG10E = new BigDecimalCache("LOG10E", 10);
		
		/**
		 * SQRT2
		 */
		this.SQRT2 = new BigDecimalCache("SQRT2", 10);
		
		/**
		 * SQRT1_2
		 */
		this.SQRT1_2 = new BigDecimalCache("SQRT1_2", 10);
	}
}

/**
 * Cache of the constant.
 * @ignore
 */
const CACHED_DATA = new BigDecimalConst();
