﻿/**
 * The script is part of konpeito.
 * 
 * AUTHOR:
 *  natade (http://twitter.com/natadea)
 * 
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import Polyfill from "../../tools/Polyfill.js";
import RoundingMode, {RoundingModeEntity} from "./RoundingMode.js";

/**
 * Configuration class for BigDecimal (immutable).
 */
export default class MathContext {

	/**
	 * Create BigDecimal configuration.
	 * @param {string|number|MathContext} precision_or_name - Precision. Or String output by MathContext.toString.
	 * @param {RoundingModeEntity} [roundingMode=RoundingMode.HALF_UP] - RoundingMode.
	 */
	constructor(precision_or_name, roundingMode) {

		/**
		 * The precision of this BigDecimal.
		 * @type {number}
		 * @private
		 */
		this.precision = 0;
		
		/**
		 * Method of rounding.
		 * @type {RoundingModeEntity}
		 * @private
		 */
		this.roundingMode = roundingMode === undefined ? RoundingMode.HALF_UP : roundingMode;

		if(typeof precision_or_name === "number") {
			this.precision = precision_or_name;
		}
		else if(precision_or_name instanceof MathContext) {
			this.roundingMode = roundingMode === undefined ? precision_or_name.roundingMode : roundingMode;
			this.precision = precision_or_name.precision;
		}
		else if(typeof precision_or_name === "string") {
			let buff;
			buff = precision_or_name.match(/precision=\d+/);
			if(buff !== null) {
				buff = buff[0].substring("precision=".length, buff[0].length);
				this.precision = parseInt(buff, 10);
			}
			buff = precision_or_name.match(/roundingMode=\w+/);
			if(buff !== null) {
				buff = buff[0].substring("roundingMode=".length, buff[0].length);
				this.roundingMode = RoundingMode.valueOf(buff);
			}	
		}
		if(this.precision < 0) {
			throw "IllegalArgumentException";
		}
	}
	
	/**
	 * Create BigDecimal configuration.
	 * @param {string|number|MathContext} precision_or_name - Precision. Or String output by MathContext.toString.
	 * @param {RoundingModeEntity} [roundingMode=RoundingMode.HALF_UP] - RoundingMode.
	 * @returns {MathContext}
	 */
	static create(precision_or_name, roundingMode) {
		if(precision_or_name instanceof MathContext) {
			return precision_or_name;
		}
		return new MathContext(precision_or_name, roundingMode);
	}

	/**
	 * The precision of this BigDecimal.
	 * @returns {number}
	 */
	getPrecision() {
		return this.precision;
	}

	/**
	 * Method of rounding.
	 * @returns {RoundingModeEntity}
	 */
	getRoundingMode() {
		return this.roundingMode;
	}

	/**
	 * Equals.
	 * @param {MathContext} x - Number to compare.
	 * @returns {boolean}
	 */
	equals(x) {
		if(x instanceof MathContext) {
			if(x.toString() === this.toString()) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Convert to string.
	 * @returns {string}
	 */
	toString() {
		return ("precision=" + this.precision + " roundingMode=" + this.roundingMode.toString());
	}

	/**
	 * Increase in the precision of x.
	 * - If the setting has no precision limit, do not change.
	 * @param {number} [x=1]
	 * @returns {MathContext}
	 */
	increasePrecision(x) {
		if(this.precision === 0) {
			return this;
		}
		const new_precision = this.precision + (x === undefined ? 1 : x);
		return new MathContext(Math.max(1, new_precision), this.roundingMode);
	}
	
	/**
	 * Decrease in the precision of x.
	 * - If the setting has no precision limit, do not change.
	 * @param {number} [x=1]
	 * @returns {MathContext}
	 */
	decreasePrecision(x) {
		if(this.precision === 0) {
			return this;
		}
		const new_precision = this.precision - (x === undefined ? 1 : x);
		return new MathContext(Math.max(1, new_precision), this.roundingMode);
	}

	// ----------------------
	// 定数
	// ----------------------
	
	/**
	 * No decimal point limit.
	 * However, an error occurs in the case of cyclic fraction in division.
	 * @returns {MathContext}
	 */
	static get UNLIMITED() {
		return DEFINE.UNLIMITED;
	}

	/**
	 * 32-bit floating point.
	 * - Significand precision: 23 bits
	 * - Equivalent of the C language float.
	 * @returns {MathContext}
	 */
	static get DECIMAL32() {
		return DEFINE.DECIMAL32;
	}


	/**
	 * 64-bit floating point.
	 * - Significand precision: 52 bits
	 * - Equivalent of the C language double.
	 * @returns {MathContext}
	 */
	static get DECIMAL64() {
		return DEFINE.DECIMAL64;
	}

	/**
	 * 128-bit floating point.
	 * - Significand precision: 112 bits
	 * - Equivalent of the C language long double.
	 * @returns {MathContext}
	 */
	static get DECIMAL128() {
		return DEFINE.DECIMAL128;
	}

	/**
	 * 256-bit floating point.
	 * - Significand precision: 237 bits
	 * @type {MathContext}
	 */
	static get DECIMAL256() {
		return DEFINE.DECIMAL256;
	}

}

/**
 * Collection of constant values used in the class.
 * @ignore
 */
const DEFINE = {

	/**
	 * No decimal point limit.
	 * However, an error occurs in the case of cyclic fraction in division.
	 * @type {MathContext}
	 */
	UNLIMITED	: new MathContext(0,	RoundingMode.HALF_UP),

	/**
	 * 32-bit floating point.
	 * - Significand precision: 23 bits
	 * - Equivalent of the C language float.
	 * @type {MathContext}
	 */
	DECIMAL32	: new MathContext(7,	RoundingMode.HALF_EVEN),

	/**
	 * 64-bit floating point.
	 * - Significand precision: 52 bits
	 * - Equivalent of the C language double.
	 * @type {MathContext}
	 */
	DECIMAL64	: new MathContext(16,	RoundingMode.HALF_EVEN),

	/**
	 * 128-bit floating point.
	 * - Significand precision: 112 bits
	 * - Equivalent of the C language long double.
	 * @type {MathContext}
	 */
	DECIMAL128	: new MathContext(34,	RoundingMode.HALF_EVEN),

	/**
	 * 256-bit floating point.
	 * - Significand precision: 237 bits
	 * @type {MathContext}
	 */
	DECIMAL256	: new MathContext(72,	RoundingMode.HALF_EVEN)
};
