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
import BigDecimal from "./BigDecimal.js";
import MathContext from "./context/MathContext.js";
import Complex from "./Complex.js";
import Matrix from "./Matrix.js";
import KonpeitoInteger from "./base/KonpeitoInteger.js";

/**
 * Fraction type argument.
 * - Fraction
 * - BigInteger
 * - BigDecimal
 * - number
 * - boolean
 * - string
 * - Array<KBigIntegerInputData>
 * - {numerator:KBigIntegerInputData,denominator:KBigIntegerInputData}
 * - {doubleValue:number}
 * - {toString:function}
 * 
 * Initialization can be performed as follows.
 * - 10, "10", "10/1", "10.0/1.0", ["10", "1"], [10, 1]
 * - 0.01, "0.01", "0.1e-1", "1/100", [1, 100], [2, 200], ["2", "200"]
 * - "1/3", "0.[3]", "0.(3)", "0.'3'", "0."3"", [1, 3], [2, 6]
 * - "3.555(123)" = 3.555123123123..., "147982 / 41625"
 * @typedef {Fraction|BigInteger|BigDecimal|number|boolean|string|Array<import("./BigInteger.js").KBigIntegerInputData>|{numerator:import("./BigInteger.js").KBigIntegerInputData,denominator:import("./BigInteger.js").KBigIntegerInputData}|{doubleValue:number}|{toString:function}} KFractionInputData
 */

/**
 * Collection of functions used in Fraction.
 * @ignore
 */
class FractionTool {

	/**
	 * Create data for Fraction from strings.
	 * @param ntext {string}
	 * @return {Fraction}
	 */
	static to_fraction_data_from_number_string(ntext) {
		let scale = 0;
		let buff;
		let is_negate = false;
		// 正規化
		let text = ntext.replace(/\s/g, "").toLowerCase();
		// +-の符号があるか
		const number_text = [];
		buff = text.match(/^[+-]+/);
		if(buff !== null) {
			buff = buff[0];
			text = text.substr(buff.length);
			if(buff.indexOf("-") !== -1) {
				is_negate = true;
				number_text.push("-");
			}
		}
		// 整数部があるか
		buff = text.match(/^[0-9]+/);
		if(buff !== null) {
			buff = buff[0];
			text = text.substr(buff.length);
			number_text.push(buff);
		}
		// 浮動小数点の計算がない場合はここで完了
		if(text.length === 0) {
			return new Fraction([new BigInteger([number_text.join(""), 10]), BigInteger.ONE]);
		}
		// 巡回小数点指定があるか
		let cyclic_decimal = null;
		if(/[()'"[\]]/.test(text)) {
			const match_data = text.match(/([^.]*)\.(\d*)[(['"](\d+)[)\]'"](.*)/);
			if(match_data === null) {
				throw "Fraction Unsupported argument " + text;
			}
			// 巡回少数の場所
			const cyclic_decimal_scale = match_data[2].length;
			const cyclic_decimal_text = match_data[3];
			// 巡回少数以外を抽出
			if(cyclic_decimal_scale === 0) {
				text = match_data[1] + match_data[4];
			}
			else {
				text = match_data[1] + "." + match_data[2] + match_data[4];
			}

			const numerator = new BigInteger([cyclic_decimal_text, 10]);
			const denominator_string = [];
			for(let i = 0; i < cyclic_decimal_text.length; i++) {
				denominator_string.push("9");
			}
			const denominator = new BigInteger([denominator_string.join(""), 10]);
			cyclic_decimal = new Fraction([numerator, denominator]);
			cyclic_decimal = cyclic_decimal.scaleByPowerOfTen(-cyclic_decimal_scale);
		}
		// 小数部があるか
		buff = text.match(/^\.[0-9]+/);
		if(buff !== null) {
			buff = buff[0];
			text = text.substr(buff.length);
			buff = buff.substr(1);
			scale = scale + buff.length;
			number_text.push(buff);
		}
		// 指数表記があるか
		buff = text.match(/^e[+-]?[0-9]+/);
		if(buff !== null) {
			buff = buff[0].substr(1);
			scale = scale - parseInt(buff, 10);
		}

		let f = null;
		{
			let numerator = null;
			let denominator = null;
			// 出力用の文字を作成
			if(scale === 0) {
				numerator = new BigInteger([number_text.join(""), 10]);
				denominator = BigInteger.ONE;
			}
			if(scale < 0) {
				for(let i = 0; i < -scale; i++) {
					number_text.push("0");
				}
				numerator = new BigInteger([number_text.join(""), 10]);
				denominator = BigInteger.ONE;
			}
			else if(scale > 0) {
				numerator = new BigInteger([number_text.join(""), 10]);
				const denominator_string = ["1"];
				for(let i = 0; i < scale; i++) {
					denominator_string.push("0");
				}
				denominator = new BigInteger([denominator_string.join(""), 10]);
			}
			f = new Fraction([numerator, denominator]);
		}
		if(cyclic_decimal) {
			if(!is_negate) {
				f = f.add(cyclic_decimal);
			}
			else {
				f = f.sub(cyclic_decimal);
			}
		}
		return f;
	}

	/**
	 * Create data for Fraction from fractional string.
	 * @param ntext {string}
	 * @return {Fraction}
	 */
	static to_fraction_data_from_fraction_string(ntext) {
		// 特殊な状態
		if(/nan|inf/i.test(ntext)) {
			const ret = new Fraction();
			ret.denominator = BigInteger.ONE;
			if(/nan/i.test(ntext)) {
				ret.numerator = BigInteger.NaN;
			}
			else if(!/-/.test(ntext)) {
				ret.numerator = BigInteger.POSITIVE_INFINITY;
			}
			else {
				ret.numerator = BigInteger.NEGATIVE_INFINITY;
			}
			return ret;
		}
		if(ntext.indexOf("/") === -1) {
			return FractionTool.to_fraction_data_from_number_string(ntext);
		}
		else {
			const fraction_value = ntext.split("/");
			const numerator_value = FractionTool.to_fraction_data_from_number_string(fraction_value[0]);
			const denominator_value = FractionTool.to_fraction_data_from_number_string(fraction_value[1]);
			return numerator_value.div(denominator_value);
		}
	}

	/**
	 * Create data for Fraction from number.
	 * @param number {number|boolean}
	 * @return {Fraction}
	 */
	static to_fraction_data_from_number(number) {
		const value = typeof number !== "boolean" ? number : (number ? 1 : 0);
		let numerator = null;
		let denominator = null;
		if(!isFinite(value)) {
			const ret = new Fraction();
			ret.denominator = BigInteger.ONE;
			if(value === Infinity) {
				ret.numerator = BigInteger.POSITIVE_INFINITY;
			}
			else if(value === - Infinity) {
				ret.numerator = BigInteger.NEGATIVE_INFINITY;
			}
			else {
				ret.numerator = BigInteger.NaN;
			}
			return ret;
		}
		// 0.0
		else if(value === 0.0) {
			const ret = new Fraction();
			ret.denominator = BigInteger.ONE;
			ret.numerator = BigInteger.ZERO;
			return ret;
		}
		// 整数
		else if( Math.abs(value - Math.round(value)) <= Number.EPSILON) {
			numerator = new BigInteger(Math.round(value));
			denominator = BigInteger.ONE;
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
			if(scale <= 0) {
				numerator = new BigInteger(value);
				denominator = BigInteger.ONE;
			}
			else {
				numerator = new BigInteger(x);
				const denominator_string = ["1"];
				for(let i = 0; i < scale; i++) {
					denominator_string.push("0");
				}
				denominator = new BigInteger([denominator_string.join(""), 10]);
			}
		}
		return new Fraction([numerator, denominator]);
	}

	/**
	 * Normalization.
	 * - Reduce fraction using gcd.
	 * - Add the sign to the numerator.
	 * - If the number is zero, the denominator is one.
	 * @param value {Fraction}
	 * @returns {void}
	 */
	static normalization(value) {
		if(value.denominator.equals(BigInteger.ONE)) {
			return;
		}
		if(value.denominator.equals(BigInteger.MINUS_ONE)) {
			value.numerator = value.numerator.negate();
			value.denominator = BigInteger.ONE;
			return;
		}
		if(value.numerator.equals(BigInteger.ZERO)) {
			value.denominator = BigInteger.ONE;
			return;
		}
		const gcd = value.numerator.gcd(value.denominator);
		let numerator = value.numerator.div(gcd);
		let denominator = value.denominator.div(gcd);
		if(denominator.sign() < 0) {
			numerator = numerator.negate();
			denominator = denominator.negate();
		}
		value.numerator = numerator;
		value.denominator = denominator;
	}

}

/**
 * Fraction class (immutable).
 */
export default class Fraction extends KonpeitoInteger {

	/**
	 * Create an fraction.
	 * 
	 * Initialization can be performed as follows.
	 * - 10, "10", "10/1", "10.0/1.0", ["10", "1"], [10, 1]
	 * - 0.01, "0.01", "0.1e-1", "1/100", [1, 100], [2, 200], ["2", "200"]
	 * - "1/3", "0.[3]", "0.(3)", "0.'3'", "0."3"", [1, 3], [2, 6]
	 * - "3.555(123)" = 3.555123123123..., "147982 / 41625"
	 * @param {KFractionInputData} [number] - Fraction data. See how to use the function.
	 */
	constructor(number) {
		super();
		
		// 分子
		/**
		 * numerator
		 * @type {BigInteger}
		 */
		this.numerator = null;

		// 分母
		/**
		 * denominator
		 * @type {BigInteger}
		 */
		this.denominator = null;

		if(arguments.length === 0) {
			this.numerator = BigInteger.ZERO;
			this.denominator = BigInteger.ONE;
		}
		else if(arguments.length === 1) {
			let is_normalization = false;
			if((typeof number === "number") || (typeof number === "boolean")) {
				const x = FractionTool.to_fraction_data_from_number(number);
				this.numerator = x.numerator;
				this.denominator = x.denominator;
			}
			else if(typeof number === "string") {
				const x = FractionTool.to_fraction_data_from_fraction_string(number);
				this.numerator = x.numerator;
				this.denominator = x.denominator;
			}
			else if(number instanceof BigInteger) {
				this.numerator = number;
				this.denominator = BigInteger.ONE;
			}
			else if(number instanceof Fraction) {
				this.numerator = number.numerator;
				this.denominator = number.denominator;
			}
			else if((number instanceof Array) && (number.length === 2)) {
				this.numerator = (number[0] instanceof BigInteger) ? number[0] : new BigInteger(number[0]);
				this.denominator = (number[1] instanceof BigInteger) ? number[1] : new BigInteger(number[1]);
				is_normalization = true;
			}
			else if(number instanceof BigDecimal) {
				const bigint = number.unscaledValue();
				if(!bigint.isFinite()) {
					this.numerator = bigint;
					this.denominator = BigInteger.ONE;
				}
				else {
					const value = new Fraction(number.unscaledValue());
					const x = value.scaleByPowerOfTen(-number.scale());
					this.numerator = x.numerator;
					this.denominator = x.denominator;
				}
			}
			else if(typeof number === "object") {
				if("doubleValue" in number) {
					const x = FractionTool.to_fraction_data_from_number(number.doubleValue);
					this.numerator = x.numerator;
					this.denominator = x.denominator;
				}
				else if(("numerator" in number) && ("denominator" in number)) {
					this.numerator = (number.numerator instanceof BigInteger) ? number.numerator : new BigInteger(number.numerator);
					this.denominator = (number.denominator instanceof BigInteger) ? number.denominator : new BigInteger(number.denominator);
					is_normalization = true;
				}
				else {
					const x1 = FractionTool.to_fraction_data_from_fraction_string(number.toString());
					this.numerator = x1.numerator;
					this.denominator = x1.denominator;
				}
			}
			else {
				throw "Fraction Unsupported argument " + number;
			}
			if(is_normalization) {
				FractionTool.normalization(this);
			}
		}
		else {
			throw "Fraction Unsupported argument " + number;
		}
	}

	/**
	 * Create an entity object of this class.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction}
	 */
	static create(number) {
		if(number instanceof Fraction) {
			return number;
		}
		else {
			return new Fraction(number);
		}
	}

	/**
	 * Convert number to Fraction type.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction}
	 */
	static valueOf(number) {
		return Fraction.create(number);
	}

	/**
	 * Convert to Fraction.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction}
	 * @ignore
	 */
	static _toFraction(number) {
		if(number instanceof Fraction) {
			return number;
		}
		else {
			return new Fraction(number);
		}
	}

	/**
	 * Convert to real number.
	 * @param {KFractionInputData} number 
	 * @returns {number}
	 * @ignore
	 */
	static _toFloat(number) {
		if(typeof number === "number") {
			return number;
		}
		else if(number instanceof Fraction) {
			return number.doubleValue;
		}
		else {
			return (new Fraction(number)).doubleValue;
		}
	}

	/**
	 * Convert to integer.
	 * @param {KFractionInputData} number 
	 * @returns {number}
	 * @ignore
	 */
	static _toInteger(number) {
		if(typeof number === "number") {
			return Math.trunc(number);
		}
		else if(number instanceof Fraction) {
			return number.intValue;
		}
		else {
			return (new Fraction(number)).intValue;
		}
	}

	/**
	 * Deep copy.
	 * @returns {Fraction} 
	 */
	clone() {
		return new Fraction(this);
	}

	/**
	 * Absolute value.
	 * @returns {Fraction} abs(A)
	 */
	abs() {
		if(!this.isFinite()) {
			return this.isNegativeInfinity() ? Fraction.POSITIVE_INFINITY : this;
		}
		if(this.sign() >= 0) {
			return this;
		}
		return this.negate();
	}

	/**
	 * this * -1
	 * @returns {Fraction} -A
	 */
	negate() {
		if(!this.isFinite()) {
			if(this.isPositiveInfinity()) {
				return Fraction.NEGATIVE_INFINITY;
			}
			else if(this.isNegativeInfinity()) {
				return Fraction.POSITIVE_INFINITY;
			}
			else {
				return this;
			}
		}
		return new Fraction([this.numerator.negate(), this.denominator]);
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
		return this.numerator.sign();
	}
	
	/**
	 * Convert to string.
	 * @returns {string} 
	 */
	toString() {
		if(!this.isFinite()) {
			return this.isNaN() ? "NaN" : (this.isPositiveInfinity() ? "Infinity" : "-Infinity");
		}
		if(this.isInteger()) {
			return this.numerator.toString();
		}
		return this.toFractionString();
	}

	/**
	 * Convert to JSON.
	 * @returns {string} 
	 */
	toJSON() {
		return this.toString();
	}

	/**
	 * Convert to string. For example, output `1/3` if `0.333...`.
	 * @returns {string} 
	 */
	toFractionString() {
		if(!this.isFinite()) {
			return this.isNaN() ? "NaN" : (this.isPositiveInfinity() ? "Infinity" : "-Infinity");
		}
		return this.numerator.toString() + "/" + this.denominator.toString();
	}

	/**
	 * Convert to string. For example, output `0.(3)` if `0.333...`.
	 * @param {KFractionInputData} [depth_max] - Maximum number of divisions.
	 * @returns {string} 
	 */
	toPlainString(depth_max) {
		if(!this.isFinite()) {
			return this.isNaN() ? "NaN" : (this.isPositiveInfinity() ? "Infinity" : "-Infinity");
		}
		if(this.isInteger()) {
			return this.numerator.toString();
		}
		const sign = this.numerator.sign();
		let src = this.numerator.abs();
		const tgt = this.denominator;
		let output = null;
		const output_array = [];
		/**
		 * @type {any}
		 */
		const remaind_map = {};
		let check_max;
		if(depth_max !== undefined) {
			check_max = Fraction._toInteger(depth_max);
		}
		else {
			check_max = (src.toString().length + tgt.toString().length) * 10;
		}
		for(let i = 0; i < check_max; i++) {
			const result = src.divideAndRemainder(tgt);
			const result_divide		= result[0];
			const result_remaind	= result[1];
			const remstr = result_remaind.toString();
			output_array.push(result_divide.toString());
			// 同一の余りがあるということは循環小数
			if(remaind_map[remstr] !== undefined) {
				output = output_array.join("");
				const n = output.indexOf(".") + remaind_map[remstr] + 1;
				output = output.substr(0, n) + "(" + output.substr(n, output.length - n) + ")";
				break;
			}
			else {
				remaind_map[remstr] = i;
			}
			if(result_remaind.isZero()) {
				break;
			}
			if(i === 0) {
				output_array.push(".");
			}
			src = result_remaind.scaleByPowerOfTen(1);
		}
		if(output === null) {
			output = output = output_array.join("");
		}
		return (sign < 0 ? "-" : "") + output;
	}

	// ----------------------
	// 四則演算
	// ----------------------
	
	/**
	 * Add.
	 * @param {KFractionInputData} num
	 * @return {Fraction} A + B
	 */
	add(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(!x.isFinite() || !y.isFinite()) {
			if(x.isNaN() || y.isNaN() || (x.isInfinite() && y.isInfinite() && !x.equalsState(y))) {
				return Fraction.NaN;
			}
			else if(x.isPositiveInfinity() || y.isPositiveInfinity()) {
				return Fraction.POSITIVE_INFINITY;
			}
			else {
				return Fraction.NEGATIVE_INFINITY;
			}
		}
		let f;
		if(x.isInteger() && y.isInteger()) {
			f = new Fraction([ x.numerator.add(y.numerator), BigInteger.ONE]);
		}
		else {
			f = new Fraction([
				x.numerator.mul(y.denominator).add(y.numerator.mul(x.denominator)),
				x.denominator.mul(y.denominator)
			]);
		}
		return f;
	}

	/**
	 * Subtract.
	 * @param {KFractionInputData} num
	 * @return {Fraction} A - B
	 */
	sub(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(!x.isFinite() || !y.isFinite()) {
			if(x.isNaN() || y.isNaN() || x.equalsState(y)) {
				return Fraction.NaN;
			}
			else if(x.isNegativeInfinity() || y.isPositiveInfinity()) {
				return Fraction.NEGATIVE_INFINITY;
			}
			else {
				return Fraction.POSITIVE_INFINITY;
			}
		}
		let f;
		if(x.isInteger() && y.isInteger()) {
			f = new Fraction([ x.numerator.sub(y.numerator), BigInteger.ONE]);
		}
		else {
			f = new Fraction([
				x.numerator.mul(y.denominator).sub(y.numerator.mul(x.denominator)),
				x.denominator.mul(y.denominator)
			]);
		}
		return f;
	}

	/**
	 * Multiply.
	 * @param {KFractionInputData} num
	 * @return {Fraction} A * B
	 */
	mul(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(!x.isFinite() || !y.isFinite()) {
			if(x.isNaN() || y.isNaN() || (x.isZero() || y.isZero())) {
				return Fraction.NaN;
			}
			else if(x.sign() * y.sign() > 0) {
				return Fraction.POSITIVE_INFINITY;
			}
			else {
				return Fraction.NEGATIVE_INFINITY;
			}
		}
		let f;
		if(x.isInteger() && y.isInteger()) {
			f = new Fraction([ x.numerator.mul(y.numerator), BigInteger.ONE]);
		}
		else {
			f = new Fraction([ x.numerator.mul(y.numerator), x.denominator.mul(y.denominator) ]);
		}
		return f;
	}

	/**
	 * Divide.
	 * @param {KFractionInputData} num
	 * @return {Fraction} A / B
	 */
	div(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(!x.isFinite() || !y.isFinite()) {
			if(x.isNaN() || y.isNaN() || (x.isInfinite() && y.isInfinite())) {
				return Fraction.NaN;
			}
			else if(x.isInfinite()) {
				if(x.sign() * y.sign() >= 0) {
					return Fraction.POSITIVE_INFINITY;
				}
				else {
					return Fraction.NEGATIVE_INFINITY;
				}
			}
			else {
				return Fraction.ZERO;
			}
		}
		else if(y.isZero()) {
			if(x.isZero()) {
				return Fraction.NaN;
			}
			else {
				return x.sign() >= 0 ? Fraction.POSITIVE_INFINITY : Fraction.NEGATIVE_INFINITY;
			}
		}
		let f;
		if(x.isInteger() && y.isInteger()) {
			f = new Fraction([ x.numerator, y.numerator]);
		}
		else {
			f = new Fraction([ x.numerator.mul(y.denominator), y.numerator.mul(x.denominator)]);
		}
		return f;
	}

	/**
	 * Inverse number of this value.
	 * @return {Fraction} 1 / A
	 */
	inv() {
		{
			if(!this.isFinite()) {
				return this.isNaN() ? Fraction.NaN : Fraction.ZERO;
			}
			if(this.isZero()) {
				return Fraction.NaN;
			}
		}
		return new Fraction([ this.denominator, this.numerator]);
	}

	/**
	 * Modulo, positive remainder of division.
	 * - Result has same sign as the Dividend.
	 * @param {KFractionInputData} num
	 * @return {Fraction} A rem B
	 */
	rem(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(!x.isFinite() || !y.isFinite() || y.isZero()) {
			return Fraction.NaN;
		}
		// x - y * fix(x/y)
		return x.sub(y.mul(x.div(y).fix()));
	}

	/**
	 * Modulo, positive remainder of division.
	 * - Result has same sign as the Divisor.
	 * @param {KFractionInputData} num
	 * @returns {Fraction} A mod B
	 */
	mod(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(y.isZero()) {
			return x;
		}
		const ret = x.rem(y);
		if(!x.equalsState(y)) {
			return ret.add(y);
		}
		else {
			return ret;
		}
	}

	// ----------------------
	// 指数
	// ----------------------
	
	/**
	 * Power function.
	 * - Supports only integers.
	 * @param {KFractionInputData} num
	 * @returns {Fraction} pow(A, B)
	 */
	pow(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		{
			if(x.isNaN() || y.isNaN()) {
				return Fraction.NaN;
			}
			if(y.isZero()) {
				return Fraction.ONE;
			}
			else if(x.isZero()) {
				return Fraction.ZERO;
			}
			else if(x.isOne()) {
				return Fraction.ONE;
			}
			else if(x.isInfinite()) {
				if(x.isPositiveInfinity()) {
					return Fraction.POSITIVE_INFINITY;
				}
				else {
					if(y.isPositiveInfinity()) {
						return Fraction.NaN;
					}
					else {
						return new Fraction(Infinity * Math.pow(-1, Math.round(y.doubleValue)));
					}
				}
			}
			else if(y.isInfinite()) {
				if(x.isNegative()) {
					// 複素数
					return Fraction.NaN;
				}
				if(x.compareTo(Fraction.ONE) < 0) {
					if(y.isPositiveInfinity()) {
						return Fraction.ZERO;
					}
					else if(y.isNegativeInfinity()) {
						return Fraction.POSITIVE_INFINITY;
					}
				}
				else {
					if(y.isPositiveInfinity()) {
						return Fraction.POSITIVE_INFINITY;
					}
					else if(y.isNegativeInfinity()) {
						return Fraction.ZERO;
					}
				}
			}
		}
		const numerator = x.numerator.pow(y.intValue);
		const denominator = x.denominator.pow(y.intValue);
		return new Fraction([ numerator, denominator ]);
	}

	/**
	 * Square.
	 * @returns {Fraction} pow(A, 2)
	 */
	square() {
		return this.mul(this);
	}

	// ----------------------
	// その他の演算
	// ----------------------
	
	/**
	 * Factorial function, x!.
	 * - Supports only integers.
	 * @returns {Fraction} n!
	 */
	factorial() {
		if(!this.isFinite()) {
			return this;
		}
		return new Fraction([this.toBigInteger().factorial(), Fraction.ONE]);
	}

	/**
	 * Multiply a multiple of ten.
	 * - Supports only integers.
	 * @param {KFractionInputData} n
	 * @returns {Fraction}
	 */
	scaleByPowerOfTen(n) {
		if(!this.isFinite()) {
			return this;
		}
		const scale = Fraction._toInteger(n);
		if(scale === 0) {
			return this;
		}
		let f;
		if(scale > 0) {
			f = new Fraction([ this.numerator.scaleByPowerOfTen(scale), this.denominator]);
		}
		else if(scale < 0) {
			f = new Fraction([ this.numerator, this.denominator.scaleByPowerOfTen(-scale)]);
		}
		return f;
	}

	// ----------------------
	// 他の型に変換用
	// ----------------------
	
	/**
	 * boolean value.
	 * @returns {boolean}
	 */
	get booleanValue() {
		return this.numerator.booleanValue;
	}

	/**
	 * integer value.
	 * @returns {number}
	 */
	get intValue() {
		if(!this.isFinite()) {
			return this.isNaN() ? NaN : (this.isPositiveInfinity() ? Infinity : -Infinity);
		}
		if(this.isInteger()) {
			return Math.trunc(this.numerator.doubleValue);
		}
		return Math.trunc(this.doubleValue);
	}

	/**
	 * floating point.
	 * @returns {number}
	 */
	get doubleValue() {
		if(!this.isFinite()) {
			return this.isNaN() ? NaN : (this.isPositiveInfinity() ? Infinity : -Infinity);
		}
		if(this.isInteger()) {
			return this.numerator.doubleValue;
		}
		const x = new BigDecimal([this.numerator, MathContext.UNLIMITED]);
		const y = new BigDecimal([this.denominator, MathContext.UNLIMITED]);
		return x.div(y, {context : MathContext.DECIMAL64}).doubleValue;
	}

	// ----------------------
	// konpeito で扱う数値型へ変換
	// ----------------------
	
	/**
	 * return BigInteger.
	 * @returns {BigInteger}
	 */
	toBigInteger() {
		return new BigInteger(this.fix().numerator);
	}
	
	/**
	 * return BigDecimal.
	 * @param {MathContext} [mc] - MathContext setting after calculation. 
	 * @returns {BigDecimal}
	 */
	toBigDecimal(mc) {
		if(!this.isFinite()) {
			return new BigDecimal(this.doubleValue);
		}
		if(this.isInteger()) {
			return new BigDecimal(this.numerator);
		}
		const x = new BigDecimal([this.numerator, MathContext.UNLIMITED]);
		const y = new BigDecimal([this.denominator, MathContext.UNLIMITED]);
		if(mc) {
			return x.div(y, {context: mc});
		}
		else {
			return x.div(y, {context: BigDecimal.getDefaultContext()});
		}
	}
	
	/**
	 * return Fraction.
	 * @returns {Fraction}
	 */
	toFraction() {
		return this;
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
	// 比較
	// ----------------------
	
	/**
	 * Equals.
	 * @param {KFractionInputData} num
	 * @returns {boolean} A === B
	 */
	equals(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(!x.isFinite() || !y.isFinite()) {
			if(x.isNaN() || y.isNaN()) {
				return false;
			}
			else if(x.equalsState(y)) {
				return true;
			}
			else {
				return false;
			}
		}
		return x.numerator.equals(y.numerator) && x.denominator.equals(y.denominator);
	}

	/**
	 * Numeric type match.
	 * @param {KFractionInputData} number 
	 * @returns {boolean}
	 */
	equalsState(number) {
		const x = this;
		const y = Fraction._toFraction(number);
		return x.numerator.equalsState(y.numerator);
	}

	/**
	 * Compare values.
	 * @param {KFractionInputData} num
	 * @returns {number} A > B ? 1 : (A === B ? 0 : -1)
	 */
	compareTo(num) {
		const x = this;
		const y = Fraction._toFraction(num);
		if(!x.isFinite() || !y.isFinite()) {
			return x.numerator.compareTo(y.numerator);
		}
		return x.sub(y).sign();
	}

	/**
	 * Maximum number.
	 * @param {KFractionInputData} number
	 * @returns {Fraction} max([A, B])
	 */
	max(number) {
		const val = Fraction._toFraction(number);
		if(this.isNaN() || val.isNaN()) {
			return Fraction.NaN;
		}
		if(this.compareTo(val) >= 0) {
			return this;
		}
		else {
			return val;
		}
	}

	/**
	 * Minimum number.
	 * @param {KFractionInputData} number
	 * @returns {Fraction} min([A, B])
	 */
	min(number) {
		const val = Fraction._toFraction(number);
		if(this.isNaN() || val.isNaN()) {
			return Fraction.NaN;
		}
		if(this.compareTo(val) >= 0) {
			return val;
		}
		else {
			return this;
		}
	}

	/**
	 * Clip number within range.
	 * @param {KFractionInputData} min 
	 * @param {KFractionInputData} max
	 * @returns {Fraction} min(max(x, min), max)
	 */
	clip(min, max) {
		const min_ = Fraction._toFraction(min);
		const max_ = Fraction._toFraction(max);
		if(this.isNaN() || min_.isNaN() || max_.isNaN()) {
			return Fraction.NaN;
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
	 * Floor.
	 * @returns {Fraction} floor(A)
	 */
	floor() {
		if(this.isInteger() || !this.isFinite()) {
			return this;
		}
		const x = this.fix();
		if(this.sign() > 0) {
			return x;
		}
		else {
			return new Fraction([x.numerator.sub(BigInteger.ONE), Fraction.ONE]);
		}
	}

	/**
	 * Ceil.
	 * @returns {Fraction} ceil(A)
	 */
	ceil() {
		if(this.isInteger() || !this.isFinite()) {
			return this;
		}
		const x = this.fix();
		if(this.sign() > 0) {
			return new Fraction([x.numerator.add(BigInteger.ONE), Fraction.ONE]);
		}
		else {
			return x;
		}
	}
	
	/**
	 * Rounding to the nearest integer.
	 * @returns {Fraction} round(A)
	 */
	round() {
		if(this.isInteger() || !this.isFinite()) {
			return this;
		}
		const x = this.floor();
		const fract = this.sub(x);
		if(fract.compareTo(Fraction.HALF) >= 0) {
			return new Fraction([x.numerator.add(BigInteger.ONE), Fraction.ONE]);
		}
		else {
			return x;
		}
	}

	/**
	 * To integer rounded down to the nearest.
	 * @returns {Fraction} fix(A), trunc(A)
	 */
	fix() {
		if(this.isInteger() || !this.isFinite()) {
			return this;
		}
		return new Fraction([this.numerator.div(this.denominator), Fraction.ONE]);
	}

	/**
	 * Fraction.
	 * @returns {Fraction} fract(A)
	 */
	fract() {
		if(!this.isFinite()) {
			return Fraction.NaN;
		}
		if(this.isInteger()) {
			return Fraction.ZERO;
		}
		return this.sub(this.floor());
	}

	// ----------------------
	// テスト系
	// ----------------------
	
	/**
	 * Return true if the value is integer.
	 * @return {boolean}
	 */
	isInteger() {
		if(!this.isFinite()) {
			return false;
		}
		return this.denominator.equals(BigInteger.ONE);
	}

	/**
	 * this === 0
	 * @return {boolean} A === 0
	 */
	isZero() {
		if(!this.isFinite()) {
			return false;
		}
		return this.numerator.isZero();
	}

	/**
	 * this === 1
	 * @return {boolean} A === 1
	 */
	isOne() {
		if(!this.isFinite()) {
			return false;
		}
		return this.numerator.equals(BigInteger.ONE) && this.denominator.equals(BigInteger.ONE);
	}

	/**
	 * this > 0
	 * @returns {boolean}
	 */
	isPositive() {
		return this.numerator.isPositive();
	}

	/**
	 * this < 0
	 * @returns {boolean}
	 */
	isNegative() {
		return this.numerator.isNegative();
	}

	/**
	 * this >= 0
	 * @returns {boolean}
	 */
	isNotNegative() {
		return this.numerator.isNotNegative();
	}
	
	/**
	 * this === NaN
	 * @returns {boolean} isNaN(A)
	 */
	isNaN() {
		return this.numerator.isNaN();
	}
	
	/**
	 * this === Infinity
	 * @returns {boolean} isPositiveInfinity(A)
	 */
	isPositiveInfinity() {
		return this.numerator.isPositiveInfinity();
	}

	/**
	 * this === -Infinity
	 * @returns {boolean} isNegativeInfinity(A)
	 */
	isNegativeInfinity() {
		return this.numerator.isNegativeInfinity();
	}

	/**
	 * this === Infinity or -Infinity
	 * @returns {boolean} isPositiveInfinity(A) || isNegativeInfinity(A)
	 */
	isInfinite() {
		return this.numerator.isInfinite();
	}
	
	/**
	 * Return true if the value is finite number.
	 * @returns {boolean} !isNaN(A) && !isInfinite(A)
	 */
	isFinite() {
		return this.numerator.isFinite();
	}

	/**
	 * Return true if the value is repeating decimal.
	 * @returns {boolean} 
	 */
	isRepeatingDecimal() {
		if(!this.isFinite()) {
			return false;
		}
		return !this.isInteger() && !(this.denominator.rem(2).isZero() || this.denominator.rem(5).isZero());
	}

	// ----------------------
	// ビット演算系
	// ----------------------
	
	/**
	 * Logical AND.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction} A & B
	 */
	and(number) {
		const n_src = this;
		const n_tgt = Fraction._toFraction(number);
		const src	= n_src.round().toBigInteger();
		const tgt	= n_tgt.round().toBigInteger();
		return new Fraction(src.and(tgt));
	}

	/**
	 * Logical OR.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction} A | B
	 */
	or(number) {
		const n_src = this;
		const n_tgt = Fraction._toFraction(number);
		const src	= n_src.round().toBigInteger();
		const tgt	= n_tgt.round().toBigInteger();
		return new Fraction(src.or(tgt));
	}

	/**
	 * Logical Exclusive-OR.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction} A ^ B
	 */
	xor(number) {
		const n_src = this;
		const n_tgt = Fraction._toFraction(number);
		const src	= n_src.round().toBigInteger();
		const tgt	= n_tgt.round().toBigInteger();
		return new Fraction(src.xor(tgt));
	}

	/**
	 * Logical Not. (mutable)
	 * - Calculated as an integer.
	 * @returns {Fraction} !A
	 */
	not() {
		const n_src = this;
		const src	= n_src.round().toBigInteger();
		return new Fraction(src.not());
	}
	
	/**
	 * this << n
	 * - Calculated as an integer.
	 * @param {KFractionInputData} n
	 * @returns {Fraction} A << n
	 */
	shift(n) {
		const src		= this.round().toBigInteger();
		const number	= Fraction._toInteger(n);
		return new Fraction(src.shift(number));
	}
	
	// ----------------------
	// factor
	// ----------------------

	/**
	 * Factorization.
	 * - Calculated as an integer.
	 * - Calculate up to `9007199254740991`.
	 * @returns {Fraction[]} factor
	 */
	factor() {
		const x = this.round().toBigInteger().factor();
		const y = [];
		for(let i = 0; i < x.length; i++) {
			y.push(new Fraction(x[i]));
		}
		return y;
	}

	// ----------------------
	// gcd, lcm
	// ----------------------
	
	/**
	 * Euclidean algorithm.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction} gcd(x, y)
	 */
	gcd(number) {
		const x = this.round().toBigInteger();
		const y = Fraction._toFraction(number).toBigInteger();
		const result = x.gcd(y);
		return new Fraction(result);
	}

	/**
	 * Extended Euclidean algorithm.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} number 
	 * @returns {Array<Fraction>} [a, b, gcd(x, y)], Result of calculating a*x + b*y = gcd(x, y).
	 */
	extgcd(number) {
		const x = this.round().toBigInteger();
		const y = Fraction._toFraction(number).toBigInteger();
		const result = x.extgcd(y);
		return [new Fraction(result[0]), new Fraction(result[1]), new Fraction(result[2])];
	}

	/**
	 * Least common multiple.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} number 
	 * @returns {Fraction} lcm(x, y)
	 */
	lcm(number) {
		const x = this.round().toBigInteger();
		const y = Fraction._toFraction(number).toBigInteger();
		const result = x.lcm(y);
		return new Fraction(result);
	}

	// ----------------------
	// mod
	// ----------------------

	/**
	 * Modular exponentiation.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} exponent
	 * @param {KFractionInputData} m 
	 * @returns {Fraction} A^B mod m
	 */
	modPow(exponent, m) {
		const A = this.round().toBigInteger();
		const B = Fraction._toFraction(exponent).toBigInteger();
		const m_ = Fraction._toFraction(m).toBigInteger();
		const result = A.modPow(B, m_);
		return new Fraction(result);
	}

	/**
	 * Modular multiplicative inverse.
	 * - Calculated as an integer.
	 * @param {KFractionInputData} m
	 * @returns {Fraction} A^(-1) mod m
	 */
	modInverse(m) {
		const A = this.round().toBigInteger();
		const m_ = Fraction._toFraction(m).toBigInteger();
		const result = A.modInverse(m_);
		return new Fraction(result);
	}
	
	// ----------------------
	// 素数
	// ----------------------
	
	/**
	 * Return true if the value is prime number.
	 * - Calculated as an integer.
	 * - Calculate up to `9007199254740991`.
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
	 * @param {KFractionInputData} [certainty=100] - Repeat count (prime precision).
	 * @returns {boolean}
	 */
	isProbablePrime(certainty) {
		const src = this.round().toBigInteger();
		return src.isProbablePrime(certainty !== undefined ? Fraction._toInteger(certainty) : undefined);
	}

	/**
	 * Next prime.
	 * @param {KFractionInputData} [certainty=100] - Repeat count (prime precision).
	 * @param {KFractionInputData} [search_max=100000] - Search range of next prime.
	 * @returns {Fraction}
	 */
	nextProbablePrime(certainty, search_max) {
		const src = this.round().toBigInteger();
		const p1 = certainty !== undefined ? Fraction._toInteger(certainty) : undefined;
		const p2 = search_max !== undefined ? Fraction._toInteger(search_max) : undefined;
		return new Fraction(src.nextProbablePrime(p1, p2));
	}

	// ----------------------
	// 定数
	// ----------------------
	
	/**
	 * -1
	 * @returns {Fraction} -1
	 */
	static get MINUS_ONE() {
		if(DEFINE.MINUS_ONE === null) {
			DEFINE.MINUS_ONE = new Fraction([BigInteger.MINUS_ONE, BigInteger.ONE]);
		}
		return DEFINE.MINUS_ONE;
	}

	/**
	 * 0
	 * @returns {Fraction} 0
	 */
	static get ZERO() {
		if(DEFINE.ZERO === null) {
			DEFINE.ZERO = new Fraction([BigInteger.ZERO, BigInteger.ONE]);
		}
		return DEFINE.ZERO;
	}

	/**
	 * 0.5
	 * @returns {Fraction} 0.5
	 */
	static get HALF() {
		if(DEFINE.HALF === null) {
			DEFINE.HALF = new Fraction([BigInteger.ONE, BigInteger.TWO]);
		}
		return DEFINE.HALF;
	}
	
	/**
	 * 1
	 * @returns {Fraction} 1
	 */
	static get ONE() {
		if(DEFINE.ONE === null) {
			DEFINE.ONE = new Fraction([BigInteger.ONE, BigInteger.ONE]);
		}
		return DEFINE.ONE;
	}
	
	/**
	 * 2
	 * @returns {Fraction} 2
	 */
	static get TWO() {
		if(DEFINE.TWO === null) {
			DEFINE.TWO = new Fraction([BigInteger.TWO, BigInteger.ONE]);
		}
		return DEFINE.TWO;
	}
	
	/**
	 * 10
	 * @returns {Fraction} 10
	 */
	static get TEN() {
		if(DEFINE.TEN === null) {
			DEFINE.TEN = new Fraction([BigInteger.TEN, BigInteger.ONE]);
		}
		return DEFINE.TEN;
	}

	/**
	 * Positive infinity.
	 * @returns {Fraction} Infinity
	 */
	static get POSITIVE_INFINITY() {
		if(DEFINE.POSITIVE_INFINITY === null) {
			DEFINE.POSITIVE_INFINITY = new Fraction(Number.POSITIVE_INFINITY);
		}
		return DEFINE.POSITIVE_INFINITY;
	}
	
	/**
	 * Negative Infinity.
	 * @returns {Fraction} -Infinity
	 */
	static get NEGATIVE_INFINITY() {
		if(DEFINE.NEGATIVE_INFINITY === null) {
			DEFINE.NEGATIVE_INFINITY = new Fraction(Number.NEGATIVE_INFINITY);
		}
		return DEFINE.NEGATIVE_INFINITY;
	}

	/**
	 * Not a Number.
	 * @returns {Fraction} NaN
	 */
	static get NaN() {
		if(DEFINE.NaN === null) {
			DEFINE.NaN = new Fraction(Number.NaN);
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
	 * @param {KFractionInputData} number
	 * @returns {Fraction} A - B
	 */
	subtract(number) {
		return this.sub(number);
	}

	/**
	 * Multiply.
	 * @param {KFractionInputData} number
	 * @returns {Fraction} A * B
	 */
	multiply(number) {
		return this.mul(number);
	}

	/**
	 * Divide.
	 * @param {KFractionInputData} number
	 * @returns {Fraction} fix(A / B)
	 */
	divide(number) {
		return this.div(number);
	}

	/**
	 * Remainder of division.
	 * - Result has same sign as the Dividend.
	 * @param {KFractionInputData} number
	 * @returns {Fraction} A % B
	 */
	remainder(number) {
		return this.rem(number);
	}

}

/**
 * Collection of constant values used in the class.
 * @ignore
 */
const DEFINE = {

	/**
	 * -1
	 * @type {any}
	 */
	MINUS_ONE : null,

	/**
	 * 0
	 * @type {any}
	 */
	ZERO : null,
	
	/**
	 * 1
	 * @type {any}
	 */
	ONE : null,

	/**
	 * 0.5
	 * @type {any}
	 */
	HALF : null,

	/**
	 * 2
	 * @type {any}
	 */
	TWO : null,

	/**
	 * 10
	 * @type {any}
	 */
	TEN : null,
	
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
	NaN : null,

};
