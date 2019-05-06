﻿/**
 * The script is part of konpeito.
 * 
 * AUTHOR:
 *  natade (http://twitter.com/natadea)
 * 
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import File from "./Util/File.mjs";
import Format from "./Util/Format.mjs";
import Log from "./Util/Log.mjs";

import Random from "./MathUtil/Random.mjs";
import RoundingMode from "./MathUtil/RoundingMode.mjs";
import MathContext from "./MathUtil/MathContext.mjs";
import BigDecimal from "./Math/BigDecimal.mjs";
import BigInteger from "./Math/BigInteger.mjs";
import Complex from "./Math/Complex.mjs";
import Matrix from "./Math/Matrix.mjs";

/**
 * 計算に利用できるデータを提供するクラス
 * 大まかに、 BigInteger, BigDecimal, Matrix の3つに分かれる。
 * Matrix は、 Complex を包括している。
 * 多倍長整数演算を特化した計算クラスは、 BigInteger 。
 * 任意精度浮動小数点演算を特化した計算クラスは、 BigDecimal 。
 * 信号処理や統計処理等を備えた汎用的な計算クラスは、 Matrix 。
 */
export default class konpeito {

	/**
	 * ファイル操作用クラス
	 * @returns {File}
	 * @ignore
	 */
	static get File() {
		return File;
	}

	/**
	 * フォーマットクラス
	 * @returns {function(text: string, parmeter: ?(string|number)}
	 * @ignore
	 */
	static get format() {
		return Format.format;
	}

	/**
	 * フォーマットクラス
	 * @returns {Log}
	 * @ignore
	 */
	static get Log() {
		return Log;
	}

	/**
	 * 多倍長整数クラス
	 * @returns {BigInteger}
	 */
	static get BigInteger() {
		return BigInteger;
	}

	/**
	 * 任意精度浮動小数点クラス
	 * @returns {BigDecimal}
	 */
	static get BigDecimal() {
		return BigDecimal;
	}

	/**
	 * BigDecimal用の丸め設定クラス
	 * @returns {RoundingMode}
	 */
	static get RoundingMode() {
		return RoundingMode;
	}

	/**
	 * BigDecimal用の環境設定クラス
	 * @returns {MathContext}
	 */
	static get MathContext() {
		return MathContext;
	}

	/**
	 * 複素数クラス
	 * @returns {Complex}
	 */
	static get Complex() {
		return Complex;
	}

	/**
	 * 複素行列クラス
	 * @returns {Matrix}
	 */
	static get Matrix() {
		return Matrix;
	}

	/**
	 * 乱数クラス
	 * @returns {Random}
	 */
	static get Random() {
		return Random;
	}
	
}