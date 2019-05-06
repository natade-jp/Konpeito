﻿/**
 * The script is part of konpeito.
 * 
 * AUTHOR:
 *  natade (http://twitter.com/natadea)
 * 
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import Random from "./toolbox/Random.mjs";
import Signal from "./toolbox/Signal.mjs";
import Complex from "./Complex.mjs";

/**
 * 内部の行列の計算用
 */
class MatrixTool {

	/**
	 * 対称行列の三重対角化する（実数計算専用）
	 * @param {Matrix} M
	 * @returns {Object<string, Matrix>}
	 */
	static tridiagonalize(M) {

		const A = Matrix.create(M);
		const a = A.getNumberMatrixArray();
		const tolerance = 1.0e-10;
		
		/**
		 * ベクトルx1とベクトルx2の内積をとる
		 * @param {Array<number>} x1
		 * @param {Array<number>} x2
		 * @param {number} [index_offset=0] - オフセット(この値から行う)
		 * @param {number} [index_max=x1.length] - 最大(この値は含めない)
		 * @returns {number} 
		 */
		const innerproduct = function(x1, x2, index_offset, index_max) {
			let y = 0;
			const ioffset = index_offset ? index_offset : 0;
			const imax = index_max ? index_max : x1.length;
			for(let i = ioffset; i < imax; i++) {
				y += x1[i] * x2[i];
			}
			return y;
		};

		/**
		 * ハウスホルダー変換
		 * @param {Array<number>} x - ハウスホルダー変換したいベクトル
		 * @param {number} [index_offset=0] - オフセット(この値から行う)
		 * @param {number} [index_max=x.length] - 最大(この値は含めない)
		 * @returns {Object<string, Matrix>} 
		 */
		const house = function(x, index_offset, index_max) {
			const ioffset = index_offset ? index_offset : 0;
			const imax = index_max ? index_max : x.length;
			// xの内積の平方根（ノルム）を計算
			let y1 = Math.sqrt(innerproduct(x, x, ioffset, imax));
			const v = [];
			if(Math.abs(y1) >= tolerance) {
				if(x[ioffset] < 0) {
					y1 = - y1;
				}
				let t;
				for(let i = ioffset, j = 0; i < imax; i++, j++) {
					if(i === ioffset) {
						v[j] = x[i] + y1;
						t = 1.0 / Math.sqrt(v[j] * y1);
						v[j] = v[j] * t;
					}
					else {
						v[j] = x[i] * t;
					}
				}
			}
			return {
				y1: - y1,	// 鏡像の1番目の要素(y2,y3,...は0)
				v : v		// 直行する単位ベクトル vT*v = 2
			};
		};

		const n = a.length;
		const d = []; // 対角成分
		const e = []; // 隣の成分

		// 参考：奥村晴彦 (1991). C言語による最新アルゴリズム事典.
		// 3重対角化の成分を取得する
		{
			for(let k = 0; k < n - 2; k++) {
				const v = a[k];
				d[k] = v[k];
				{
					const H = house(v, k + 1, n);
					e[k] = H.y1;
					for(let i = 0; i < H.v.length; i++) {
						v[k + 1 + i] = H.v[i];
					}
				}
				if(Math.abs(e[k]) < tolerance) {
					continue;
				}
				for(let i = k + 1; i < n; i++) {
					let s = 0;
					for(let j = k + 1; j < i; j++) {
						s += a[j][i] * v[j];
					}
					for(let j = i; j < n; j++) {
						s += a[i][j] * v[j];
					}
					d[i] = s;
				}
				const t = innerproduct(v, d, k + 1, n) / 2.0;
				for(let i = n - 1; i > k; i--) {
					const p = v[i];
					const q = d[i] - (t * p);
					d[i] = q;
					for(let j = i; j < n; j++) {
						const r = p * d[j] + q * v[j];
						a[i][j] = a[i][j] - r;
					}
				}
			}
			if(n >= 2) {
				d[n - 2] = a[n - 2][n - 2];
				e[n - 2] = a[n - 2][n - 1];
			}
			if(n >= 1) {
				d[n - 1] = a[n - 1][n - 1];
			}
		}

		//変換P行列を求める
		for(let k = n - 1; k >= 0; k--) {
			const v = a[k];
			if(k < n - 2) {
				for(let i = k + 1; i < n; i++) {
					const w = a[i];
					const t = innerproduct(v, w, k + 1, n);
					for(let j = k + 1; j < n; j++) {
						w[j] -= t * v[j];
					}
				}
			}
			for(let i = 0; i < n; i++) {
				v[i] = 0.0;
			}
			v[k] = 1.0;
		}

		// d と e の配列を使って、三重対角行列を作成する
		const H = Matrix.createMatrixDoEachCalculation(function(row, col) {
			if(row === col) {
				return new Complex(d[row]);
			}
			else if(Math.abs(row - col) === 1) {
				return new Complex(e[((row + col) * 0.5) | 0]);
			}
			else {
				return Complex.ZERO;
			}
		}, n, n);

		return {
			P : (new Matrix(a)).T(),
			H : H
		};
	}

	/**
	 * 対称行列の固有値分解する（実数計算専用）
	 * @param {Matrix} M - 対称行列
	 * @returns {Object<string, Matrix>}
	 */
	static eig(M) {
		
		const A = Matrix.create(M);
		
		// QR法により固有値を求める
		let is_error = false;
		const tolerance = 1.0e-10;
		const PH = A.tridiagonalize();
		const a = PH.P.getNumberMatrixArray();
		const h = PH.H.getNumberMatrixArray();
		const n = A.row_length;

		// 成分の抽出
		const d = []; // 対角成分
		const e = []; // 隣の成分
		for(let i = 0; i < n; i++) {
			d[i] = h[i][i];
			e[i] = (i === 0) ? 0.0 : h[i][i - 1];
		}

		// 参考：奥村晴彦 (1991). C言語による最新アルゴリズム事典.
		const MAX_ITER = 100;
		for(let h = n - 1; h > 0; h--) {
			let j = h;
			for(j = h;j >= 1; j--) {
				if(Math.abs(e[j]) <= (tolerance * (Math.abs(d[j - 1]) + Math.abs(d[j])))) {
					break;
				}
			}
			if(j == h) {
				continue;
			}
			let iter = 0;
			while(true) {
				iter++;
				if(iter > MAX_ITER) {
					is_error = true;
					break;
				}
				let w = (d[h - 1] - d[h]) / 2.0;
				let t = e[h] * e[h];
				let s = Math.sqrt(w * w + t);
				if(w < 0) {
					s = - s;
				}
				let x = d[j] - d[h] + (t / (w + s));
				let y = e[j + 1];
				for(let k = j; k < h; k++) {
					let c, s;
					if(Math.abs(x) >= Math.abs(y)) {
						t = - y / x;
						c = 1.0 / Math.sqrt(t * t + 1);
						s = t * c;
					}
					else {
						t = - x / y;
						s = 1.0 / Math.sqrt(t * t + 1);
						c = t * s;
					}
					w = d[k] - d[k + 1];
					t = (w * s + 2.0 * c * e[k + 1]) * s;
					d[k] -= t;
					d[k + 1] += t;
					if(k > j) {
						e[k] = c * e[k] - s * y;
					}
					e[k + 1] += s * (c * w - 2.0 * s * e[k + 1]);
					for(let i = 0; i < n; i++) {
						x = a[i][k];
						y = a[i][k + 1];
						a[i][k    ] = c * x - s * y;
						a[i][k + 1] = s * x + c * y;
					}
					if(k < h - 1) {
						x = e[k + 1];
						y = -s * e[k + 2];
						e[k + 2] *= c;
					}
				}
				if(Math.abs(e[h]) <= tolerance * (Math.abs(d[h - 1]) + Math.abs(d[h]))) {
					break;
				}
			}
			if(is_error) {
				break;
			}
		}

		// ソート
		const vd_sort = function(V, d) {
			const len = d.length;
			const sortdata = [];
			for(let i = 0; i < len; i++) {
				sortdata[i] = {
					sigma : d[i],
					index : i
				};
			}
			const compare = function(a, b){
				if(a === b) {
					return 0;
				}
				return (a < b ? -1 : 1);
			};
			sortdata.sort(compare);
			const MOVE = Matrix.zeros(len);
			const ND = Matrix.zeros(len);
			for(let i = 0; i < len; i++) {
				ND.matrix_array[i][i] = new Complex(sortdata[i].sigma);
				MOVE.matrix_array[i][sortdata[i].index] = Complex.ONE;
			}
			return {
				V : V.mul(MOVE),
				D : ND
			};
		};
		const VD = vd_sort(new Matrix(a), d);
		return VD;
	}
}

/**
 * コンストラクタ用の関数群
 */
const ConstructorTool = {

	/**
	 * 対象ではないregexpの情報以外も抽出match
	 * @param {string} text - 検索対象
	 * @param {RegExp} regexp - 検索したい正規表現
	 * @returns {Array<Object<boolean, string>>}
	 */
	match2 : function(text, regexp) {
		// 対象ではないregexpの情報以外も抽出match
		// つまり "1a2b" で \d を抽出すると、次のように抽出される
		// [false "1"]
		// [true "a"]
		// [false "2"]
		// [true "b"]
		// 0 ... 一致したかどうか
		// 1 ... 一致した文字列、あるいは一致していない文字列
		const output = [];
		let search_target = text;
		let match = true;
		for(let x = 0; x < 1000; x++) {
			match = search_target.match(regexp);
			if(match === null) {
				if(search_target.length) {
					output.push([ false, search_target ]);
				}
				break;
			}
			if(match.index > 0) {
				output.push([ false, search_target.substr(0, match.index) ]);
			}
			output.push([ true, match[0] ]);
			search_target = search_target.substr(match.index + match[0].length);
		}
		return output;
	},
	
	/**
	 * ブラケットに囲まれていたら、前後のブラケットを除去
	 * @param {string} text - ブラケットを除去したい文字
	 * @returns {string|null} 除去した文字列（ブラケットがない場合は、null）
	 */
	trimBracket : function(text) {
		// 前後に[]があるか確認
		if( !(/^\[/).test(text) || !(/\]$/).test(text)) {
			return null;
		}
		// 前後の[]を除去
		return text.substring(1, text.length - 1);
	},

	/**
	 * JSONで定義された文字列データからMatrix型のデータを作成する
	 * @param {string} text - 調査したい文字列
	 * @returns {Array<Array<Complex>>} Matrix型で使用される内部の配列
	 */
	toMatrixFromStringForArrayJSON : function(text) {
		const matrix_array = [];
		// さらにブランケット内を抽出
		let rows = text.match(/\[[^\]]+\]/g);
		if(rows === null) {
			// ブランケットがない場合は、1行行列である
			rows = [text];
		}
		// 各ブランケット内を列ごとに調査
		for(let row_count = 0; row_count < rows.length; row_count++) {
			const row = rows[row_count];
			const column_array = row.substring(1, row.length - 1).split(",");
			const rows_array = [];
			for(let col_count = 0; col_count < column_array.length; col_count++) {
				const column = column_array[col_count];
				rows_array[col_count] = new Complex(column);
			}
			matrix_array[row_count] = rows_array;
		}
		return matrix_array;
	},

	/**
	 * 初期値と差分値と最終値から、その値が入った配列を作成する
	 * @param {number} from - 最初の値
	 * @param {number} delta - 差分
	 * @param {number} to - 繰り返す先の値（この値は含めない）
	 * @returns {Array<number>}
	 */
	InterpolationCalculation : function(from, delta, to) {
		const FromIsGreaterThanTo = to.compareTo(from);
		if(FromIsGreaterThanTo === 0) {
			return from;
		}
		if(delta.isZero()) {
			throw "IllegalArgumentException";
		}
		// delta が負のため、どれだけたしても to にならない。
		if(delta.isNegative() && (FromIsGreaterThanTo === -1)) {
			throw "IllegalArgumentException";
		}
		const rows_array = [];
		let num = from;
		rows_array[0] = num;
		for(let i = 1; i < 0x10000; i++) {
			num = num.add(delta);
			if(num.compareTo(to) === FromIsGreaterThanTo) {
				break;
			}
			rows_array[i] = num;
		}
		return rows_array;
	},

	/**
	 * 文字列からMatrix型の行列データの行部分に変換
	 * @param {string} row_text - 行列の1行を表す文字列
	 * @returns {Array<Complex>}
	 */
	toArrayFromString : function(row_text) {
		// 「:」のみ記載されていないかの確認
		if(row_text.trim() === ":") {
			return ":";
		}
		// 左が実数（強制）で右が複素数（任意）タイプ
		const reg1 = /[+-]? *[0-9]+(\.[0-9]+)?(e[+-]?[0-9]+)?( *[+-] *[- ]?([0-9]+(\.[0-9]+)?(e[+-]?[0-9]+)?)?[ij])?/;
		// 左が複素数（強制）で右が実数（任意）タイプ
		const reg2 = /[+-]? *([0-9]+(\.[0-9]+)?(e[+-]?[0-9]+)?)?[ij]( *[+] *[- ]?([0-9]+(\.[0-9]+)?(e[+-]?[0-9]+)?)?)?/;
		// reg2優先で検索
		const reg3 = new RegExp("(" + reg2.source + ")|(" + reg1.source + ")", "i");
		// 問題として 1 - -jが通る
		const xs = ConstructorTool.match2(row_text, reg3);
		const rows_array = [];

		for(let i = 0; i < xs.length; i++) {
			const xx = xs[i];
			if(!xx[0]) {
				// 一致していないデータであれば次へ
				continue;
			}
			// 「:記法」 1:3 なら 1,2,3。 1:2:9 なら 1:3:5:7:9
			if((i < xs.length - 2) && !xs[i + 1][0] && /:/.test(xs[i + 1][1])) {
				let from, delta, to;
				if((i < xs.length - 4) && !xs[i + 3][0] && /:/.test(xs[i + 3][1])) {
					from = new Complex(xx[1]);
					delta = new Complex(xs[i + 2][1]);
					to = new Complex(xs[i + 4][1]);
					i += 4;
				}
				else {
					from = new Complex(xx[1]);
					delta = Complex.ONE;
					to = new Complex(xs[i + 2][1]);
					i += 2;
				}
				const ip_array = ConstructorTool.InterpolationCalculation(from, delta, to);
				for(let j = 0; j < ip_array.length; j++) {
					rows_array.push(ip_array[j]);
				}
			}
			else {
				rows_array.push(new Complex(xx[1]));
			}
		}

		return rows_array;
	},

	/**
	 * JSON以外の文字列で定義された文字列データからMatrix型のデータを作成する
	 * @param {string} text - 調査したい文字列
	 * @returns {Array<Array<Complex>>} Matrix型で使用される内部の配列
	 */
	toMatrixFromStringForArrayETC : function(text) {
		// 行ごとを抽出して
		const rows = text.split(";");
		const matrix_array = new Array(rows.length);
		for(let row_count = 0; row_count < rows.length; row_count++) {
			// 各行の文字を解析
			matrix_array[row_count] = ConstructorTool.toArrayFromString(rows[row_count]);
		}
		return matrix_array;
	},

	/**
	 * 行列用の文字列データから構成されるMatrix型のデータを作成する
	 * @param {string} text - 調査したい文字列
	 * @returns {Array<Array<Complex>>} Matrix型で使用される内部の配列
	 */
	toMatrixFromStringForArray : function(text) {
		// JSON形式
		if(/[[\],]/.test(text)) {
			return ConstructorTool.toMatrixFromStringForArrayJSON(text);
		}
		// それ以外(MATLAB, Octave, Scilab)
		else {
			return ConstructorTool.toMatrixFromStringForArrayETC(text);
		}
	},

	/**
	 * 文字列データからMatrix型のデータを作成する
	 * @param {string} text - 調査したい文字列
	 * @returns {Array<Array<Complex>>} Matrix型で使用される内部の配列
	 */
	toMatrixFromString : function(text) {
		// 前後のスペースを除去
		const trimtext = text.replace(/^\s*|\s*$/g, "");
		// ブランケットを外す
		const withoutBracket = ConstructorTool.trimBracket(trimtext);
		if(withoutBracket) {
			// 配列用の初期化
			return ConstructorTool.toMatrixFromStringForArray(withoutBracket);
		}
		else {
			// スカラー用の初期化
			return [[new Complex(text)]];
		}
	},

	/**
	 * Matrix型内部データが行列データとして正しいかを調べる
	 * @param {Array<Array<Complex>>} m_array
	 * @returns {boolean} 
	 */
	isCorrectMatrixArray : function(m_array) {
		if(m_array.length === 0) {
			return false;
		}
		const num = m_array[0].length;
		if(num === 0) {
			return false;
		}
		for(let i = 1; i < m_array.length; i++) {
			if(m_array[i].length !== num) {
				return false;
			}
		}
		return true;
	}
};

/**
 * 複素行列クラス (immutable)
 */
export default class Matrix {
	
	/**
	 * 複素行列を作成
	 * 引数は次のタイプをとれます
	 * ・4 				整数や実数
	 * ・"1 + j"		文字列で複素数をわたす
	 * ・[1,2]			1次元配列
	 * ・[[1,2],[3,4]]	行列
	 * ・["1+j", "2+j"]	複素数を含んだ行列
	 * ・"[1 1:0.5:3]"		MATLAB/Octave/Scilab互換
	 * @param {Object|number|string|Array} number - 行列データ( "1 + j", [1 , 1] など)
	 */
	constructor(number) {
		let matrix_array = null;
		let is_check_string = false;
		if(arguments.length === 1) {
			const y = number;
			// 行列型なら中身をディープコピーする
			if(y instanceof Matrix) {
				matrix_array = new Array(y.row_length);
				for(let i = 0; i < y.row_length; i++) {
					matrix_array[i] = new Array(y.column_length);
					for(let j = 0; j < y.column_length; j++) {
						matrix_array[i][j] = y.matrix_array[i][j];
					}
				}
			}
			// 複素数型なら1要素の行列
			else if(y instanceof Complex) {
				matrix_array = [[y]];
			}
			// 行列の場合は中身を解析していく
			else if(y instanceof Array) {
				matrix_array = [];
				for(let row_count = 0; row_count < y.length; row_count++) {
					// 毎行ごと調査
					const row = y[row_count];
					// 各行の要素が配列の場合は、配列内配列のため再度for文で調べていく
					if(row instanceof Array) {
						const rows_array = new Array(row.length);
						// 1行を調査する
						for(let col_count = 0; col_count < row.length; col_count++) {
							const column = row[col_count];
							// 1要素が複素数ならそのまま代入
							if(column instanceof Complex) {
								rows_array[col_count] = column;
							}
							// 1要素が行列なら、中身を抽出して代入
							else if(column instanceof Matrix) {
								if(!column.isScalar()) {
									throw "Matrix in matrix";
								}
								rows_array[col_count] = column.scalar;
							}
							// それ以外の場合は、複素数クラスのコンストラクタに判断させる
							else {
								rows_array[col_count] = new Complex(column);
							}
						}
						matrix_array[row_count] = rows_array;
					}
					// 1つの値のみ宣言の場合は、中の配列を行ベクトルとして定義する
					else {
						// 行ベクトルの初期化
						if(row_count === 0) {
							matrix_array[0] = new Array(y.length);
						}
						// 1要素が複素数ならそのまま代入
						if(row instanceof Complex) {
							matrix_array[0][row_count] = row;
						}
						// 1要素が行列なら、中身を抽出して代入
						else if(row instanceof Matrix) {
							if(!row.isScalar()) {
								throw "Matrix in matrix";
							}
							matrix_array[0][row_count] = row.scalar;
						}
						// それ以外の場合は、複素数クラスのコンストラクタに判断させる
						else {
							matrix_array[0][row_count] = new Complex(row);
						}
					}
				}
			}
			// 文字列の場合は、文字列解析を行う
			else if(typeof y === "string" || y instanceof String) {
				is_check_string = true;
				matrix_array = ConstructorTool.toMatrixFromString(y);
			}
			// 文字列変換できる場合は返還後に、文字列解析を行う
			else if(y instanceof Object && y.toString) {
				is_check_string = true;
				matrix_array = ConstructorTool.toMatrixFromString(y.toString());
			}
			// 単純なビルトインの数値など
			else {
				matrix_array = [[new Complex(y)]];
			}
		}
		else {
			throw "Matrix : Many arguments [" + arguments.length + "]";
		}
		if(is_check_string) {
			// 文字列データの解析の場合、":" データが紛れていないかを確認する。
			// 紛れていたらその行は削除する。
			for(let row = 0; row < matrix_array.length; row++) {
				if(matrix_array[row] === ":") {
					matrix_array.splice(row--, 1);
				}
			}
		}
		if(!ConstructorTool.isCorrectMatrixArray(matrix_array)) {
			throw "new Matrix IllegalArgumentException";
		}
		this.matrix_array = matrix_array;
		this.row_length = this.matrix_array.length;
		this.column_length = this.matrix_array[0].length;
		this.string_cash = null;
	}

	/**
	 * 複製
	 * @returns {Matrix}
	 */
	clone() {
		return new Matrix(this.matrix_array);
	}

	/**
	 * 文字列化
	 * @returns {string} 
	 */
	toString() {
		if(this.string_cash) {
			return this.string_cash;
		}
		const exp_turn_point = 9;
		const exp_turn_num = Math.pow(10, exp_turn_point);
		const exp_point = 4;
		let isDrawImag = false;
		let isDrawExp = false;
		let draw_decimal_position = 0;

		// 行列を確認して表示するための表示方法の確認する
		this._each(
			function(num) {
				if(!num.isReal()) {
					isDrawImag = true;
				}
				if(Math.abs(num.real) >= exp_turn_num) {
					isDrawExp = true;
				}
				if(Math.abs(num.imag) >= exp_turn_num) {
					isDrawExp = true;
				}
				draw_decimal_position = Math.max(draw_decimal_position, num.getDecimalPosition());
			}
		);

		if(draw_decimal_position > 0) {
			draw_decimal_position = exp_point;
		}

		// 文字列データを作成とともに、最大の長さを記録する
		let str_max = 0;
		const draw_buff = [];
		// 数値データを文字列にする関数（eの桁がある場合は中身は3桁にする）
		const toStrFromFloat = function(number) {
			if(!isDrawExp) {
				return number.toFixed(draw_decimal_position);
			}
			const str = number.toExponential(exp_point);
			const split = str.split("e");
			let exp_text = split[1];
			if(exp_text.length === 2) {
				exp_text = exp_text.substr(0, 1) + "00" + exp_text.substr(1);
			}
			else if(exp_text.length === 3) {
				exp_text = exp_text.substr(0, 1) + "0" + exp_text.substr(1);
			}
			return split[0] + "e" + exp_text;
		};
		this._each(
			function(num) {
				const data = {};
				let real = num.real;
				data.re_sign = real < 0 ? "-" : " ";
				real = Math.abs(real);
				data.re_str = toStrFromFloat(real);
				str_max = Math.max(str_max, data.re_str.length + 1);
				if(isDrawImag) {
					let imag = num.imag;
					data.im_sign = imag < 0 ? "-" : "+";
					imag = Math.abs(imag);
					data.im_str = toStrFromFloat(imag);
					str_max = Math.max(str_max, data.im_str.length + 1);
				}
				draw_buff.push(data);
			}
		);

		// 右寄せ用関数
		const right = function(text, length) {
			const space = "                                        ";
			return space.substr(0, length - text.length) + text;
		};
		// 出力用文字列を作成する
		const output = [];
		const that = this;
		this._each(
			function(num, row, col) {
				const data = draw_buff.shift();
				let text = right(data.re_sign + data.re_str, str_max);
				if(isDrawImag) {
					text += " " + data.im_sign + right(data.im_str, str_max) + "i";
				}
				output.push(text);
				output.push((col < that.column_length - 1) ? " " : "\n");
			}
		);

		this.string_cash = output.join("");

		return this.string_cash;
	}

	/**
	 * A.equals(B) = A === B
	 * @param {Matrix} number
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean} A === B
	 */
	equals(number, epsilon) {
		const M1 = this;
		const M2 = Matrix.create(number);
		if((M1.row_length !== M2.row_length) || (M1.column_length !== M2.column_length)) {
			return false;
		}
		if((M1.row_length === 1) || (M1.column_length ===1)) {
			return M1.scalar.equals(M2.scalar);
		}
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		for(let row = 0; row < this.row_length; row++) {
			for(let col = 0; col < this.column_length; col++) {
				if(!x1[row][col].equals(x2[row][col], epsilon)) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * 行列を構成する複素数の実数のみを抽出し、JavaScriptで扱える配列を作成する
	 * @returns {Array} JavaScriptで扱える実数の配列
	 */
	getNumberMatrixArray() {
		const y = new Array(this.row_length);
		for(let i = 0; i < this.row_length; i++) {
			y[i] = new Array(this.column_length);
			for(let j = 0; j < this.column_length; j++) {
				y[i][j] = this.matrix_array[i][j].real;
			}
		}
		return y;
	}
	
	/**
	 * 行列を構成するComplex型で構成された配列を作成する
	 * @returns {Array} 行列のComplex配列を返します
	 */
	getComplexMatrixArray() {
		const y = new Array(this.row_length);
		for(let i = 0; i < this.row_length; i++) {
			y[i] = new Array(this.column_length);
			for(let j = 0; j < this.column_length; j++) {
				y[i][j] = this.matrix_array[i][j];
			}
		}
		return y;
	}
	
	/**
	 * 任意の引数データを使用して行列を作成（引数によっては行列オブジェクトを新規作成する）
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	static create(number) {
		if((arguments.length === 1) && (number instanceof Matrix)) {
			return number;
		}
		else {
			return new Matrix(number);
		}
	}
	
	/**
	 * キャッシュを削除する
	 */
	_clearCash() {
		if(this.string_cash) {
			delete this.string_cash;
		}
	}

	/**
	 * 行列内の全ての値に処理を加えます。ミュータブルです。
	 * 内部処理用
	 * @param {function(num: Complex, row: number, col: number): ?Complex} eachfunc - Function(num, row, col)
	 * @returns {Matrix} 処理実行後の行列
	 */
	_each(eachfunc) {
		let isclearcash = false;
		// 行優先ですべての値に対して指定した関数を実行する。内容を書き換える可能性もある
		for(let row = 0; row < this.row_length; row++) {
			for(let col = 0; col < this.column_length; col++) {
				const ret = eachfunc(this.matrix_array[row][col], row, col);
				if(ret === undefined) {
					continue;
				}
				else if(ret instanceof Complex) {
					this.matrix_array[row][col] = ret;
				}
				else if(ret instanceof Matrix) {
					this.matrix_array[row][col] = ret.scalar;
				}
				else {
					this.matrix_array[row][col] = new Complex(ret);
				}
				isclearcash = true;
			}
		}
		if(isclearcash) {
			this._clearCash();
		}
		return this;
	}

	/**
	 * 行列内の各値に対して指定した初期化を行った行列オブジェクトを新規作成する
	 * @param {function(num: Complex, row: number, col: number): ?Complex} eachfunc - Function(row, col)
	 * @param {number} dimension - 次元数
	 * @param {number} [column_length=dimension] - 列数
	 * @returns {Matrix} 処理実行後の行列
	 */
	static createMatrixDoEachCalculation(eachfunc, dimension, column_length) {
		if((arguments.length === 0) || (arguments.length > 3)) {
			throw "IllegalArgumentException";
		}
		const y_row_length = dimension;
		const y_column_length = column_length ? column_length : dimension;
		const y = new Array(y_row_length);
		for(let row = 0; row < y_row_length; row++) {
			y[row] = new Array(y_column_length);
			for(let col = 0; col < y_column_length; col++) {
				const ret = eachfunc(row, col);
				if(ret === undefined) {
					y[row][col] = Complex.ZERO;
				}
				else if(ret instanceof Complex) {
					y[row][col] = ret;
				}
				else if(ret instanceof Matrix) {
					y[row][col] = ret.scalar;
				}
				else {
					y[row][col] = new Complex(ret);
				}
			}
		}
		return new Matrix(y);
	}

	/**
	 * 本行列内部の全ての値に対して指定した処理を加える
	 * @param {function(num: Complex, row: number, col: number): ?Complex} eachfunc - Function(num, row, col)
	 * @returns {Matrix} 処理実行後の行列
	 */
	cloneMatrixDoEachCalculation(eachfunc) {
		return this.clone()._each(eachfunc);
	}

	/**
	 * 列優先でベクトルに対して何か処理を行い、行列を作成します。
	 * @param {function(array: Array<Complex>): Array<Complex>} array_function - Function(array)
	 * @returns {Matrix} 処理実行後の行列
	 */
	__column_oriented_1_dimensional_processing(array_function) {
		if(this.isRow()) {
			// 1行であれば、その1行に対して処理を行う
			const row_array = new Array(this.row_length);
			for(let col = 0; col < this.column_length; col++) {
				row_array[col] = this.matrix_array[0][col];
			}
			return new Matrix(array_function(row_array));
		}
		else {
			const y = new Matrix(0);
			y._resize(1, this.column_length);
			// 1列、行列であれば、列ごとに処理を行う
			for(let col = 0; col < this.column_length; col++) {
				const col_array = new Array(this.row_length);
				for(let row = 0; row < this.row_length; row++) {
					col_array[row] = this.matrix_array[row][col];
				}
				const col_output = array_function(col_array);
				y._resize(Math.max(y.row_length, col_output.length), y.column_length);
				for(let row = 0; row < col_output.length; row++) {
					y.matrix_array[row][col] = col_output[row];
				}
			}
			return y;
		}
	}

	/**
	 * 行列に対して、行と列に同一の処理を行い、行列を作成します。
	 * @param {function(array: Array<Complex>): Array<Complex>} array_function - Function(array)
	 * @returns {Matrix} 処理実行後の行列
	 */
	__column_oriented_2_dimensional_processing(array_function) {
		const y = new Matrix(0);
		// 行ごとに処理を行う
		y._resize(this.row_length, 1);
		for(let row = 0; row < this.row_length; row++) {
			const row_array = new Array(this.row_length);
			for(let col = 0; col < this.column_length; col++) {
				row_array[col] = this.matrix_array[0][col];
			}
			const row_output = array_function(row_array);
			y._resize(y.row_length, Math.max(y.column_length, row_output.length));
			for(let col = 0; col < row_output.length; col++) {
				y.matrix_array[row][col] = row_output[col];
			}
		}
		// 列ごとに処理を行う
		for(let col = 0; col < y.column_length; col++) {
			const col_array = new Array(y.row_length);
			for(let row = 0; row < y.row_length; row++) {
				col_array[row] = y.matrix_array[row][col];
			}
			const col_output = array_function(col_array);
			y._resize(Math.max(y.row_length, col_output.length), y.column_length);
			for(let row = 0; row < col_output.length; row++) {
				y.matrix_array[row][col] = col_output[row];
			}
		}
		return y;
	}

	/**
	 * 行列（ベクトル）内の指定した箇所の値をComplex型で返す。
	 * @param {Matrix} arg1 - 位置／ベクトルの場合は何番目のベクトルか
	 * @param {Matrix} [arg2] - 列番号（行番号と列番号で指定する場合（任意））
	 * @returns {Complex} 
	 */
	getComplex(arg1, arg2) {
		let arg1_data = null;
		let arg2_data = null;
		{
			if(typeof arg1 === "string" || arg1 instanceof String) {
				arg1_data = new Matrix(arg1);
			}
			else {
				arg1_data = arg1;
			}
		}
		if(arguments.length === 2) {
			if(typeof arg2 === "string" || arg2 instanceof String) {
				arg2_data = new Matrix(arg2);
			}
			else {
				arg2_data = arg2;
			}
		}
		const get_scalar = function(x) {
			let y;
			let is_scalar = false;
			if(typeof arg1 === "number" || arg1 instanceof Number) {
				y = Math.round(x);
				is_scalar = true;
			}
			else if(arg1 instanceof Complex)  {
				y = Math.round(x.real);
				is_scalar = true;
			}
			else if((arg1 instanceof Matrix) && arg1.isScalar()) {
				y = Math.round(x.doubleValue);
				is_scalar = true;
			}
			return {
				number : y,
				is_scalar : is_scalar
			};
		};
		let is_scalar = true;
		let arg1_scalar = null;
		let arg2_scalar = null;
		if(arguments.length === 1) {
			arg1_scalar = get_scalar(arg1_data);
			is_scalar &= arg1_scalar.is_scalar;
		}
		else if(arguments.length === 2) {
			arg1_scalar = get_scalar(arg1_data);
			is_scalar &= arg1_scalar.is_scalar;
			arg2_scalar = get_scalar(arg2_data);
			is_scalar &= arg2_scalar.is_scalar;
		}
		// 1つのみ指定した場合
		if(is_scalar) {
			if(this.isRow()) {
				return this.matrix_array[0][arg1_scalar.number];
			}
			else if(this.isColumn()) {
				return this.matrix_array[arg1_scalar.number][0];
			}
			else {
				return this.matrix_array[arg1_scalar.number][arg2_scalar.number];
			}
		}
		else {
			throw "getComplex not scalar : " + this;
		}
	}

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// 行列の基本操作、基本情報の取得
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	
	/**
	 * 行列の最初の要素の整数値。スカラー値を取得するときなどを想定。
	 * @returns {number}
	 */
	get intValue() {
		return (this.matrix_array[0][0].real) | 0;
	}

	/**
	 * 行列の最初の要素の実数値。スカラー値を取得するときなどを想定。
	 * @returns {number}
	 */
	get doubleValue() {
		return this.matrix_array[0][0].real;
	}

	/**
	 * 行列の最初の要素。スカラー値を取得するときなどを想定。
	 * @returns {Complex}
	 */
	get scalar() {
		return this.matrix_array[0][0];
	}

	/**
	 * 行列の最も大きい行数、列数を返す
	 * @returns {number}
	 */
	get length() {
		return this.row_length > this.column_length ? this.row_length : this.column_length;
	}

	/**
	 * 行列の1ノルム
	 * @returns {number}
	 */
	get norm1() {
		const y = this.matrix_array;
		// 行ノルムを計算する
		if(this.isRow()) {
			let sum = 0.0;
			for(let col = 0; col < this.column_length; col++) {
				sum += y[0][col].norm;
			}
			return sum;
		}
		// 列ノルムを計算する
		else if(this.isColumn()) {
			let sum = 0.0;
			for(let row = 0; row < this.row_length; row++) {
				sum = y[row][0].norm;
			}
			return sum;
		}
		// 列の和の最大値
		let max = 0;
		// 列を固定して行の和を計算
		for(let col = 0; col < this.column_length; col++) {
			let sum = 0;
			for(let row = 0; row < this.row_length; row++) {
				sum += y[row][col].norm;
			}
			if(max < sum) {
				max = sum;
			}
		}
		return max;
	}
	
	/**
	 * 行列の2ノルム
	 * @returns {number}
	 */
	get norm2() {
		const y = this.matrix_array;
		// 行ノルムを計算する
		if(this.isRow()) {
			let sum = 0.0;
			for(let col = 0; col < this.column_length; col++) {
				sum += y[0][col].square().real;
			}
			return Math.sqrt(sum);
		}
		// 列ノルムを計算する
		else if(this.isColumn()) {
			let sum = 0.0;
			for(let row = 0; row < this.row_length; row++) {
				sum = y[row][0].square().real;
			}
			return Math.sqrt(sum);
		}
		return this.svd().S.diag().max().scalar.real;
	}

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// 行列の作成関係
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	
	/**
	 * 単位行列を作成
	 * @param {number} dimension - 次元数
	 * @param {number} [column_length] - 列数
	 * @returns {Matrix}
	 */
	static eye(dimension, column_length) {
		return Matrix.createMatrixDoEachCalculation(function(row, col) {
			return row === col ? Complex.ONE : Complex.ZERO;
		}, dimension, column_length);
	}
	
	/**
	 * 指定した数値で初期化
	 * @param {Matrix} number - 初期値
	 * @param {number} dimension - 次元数
	 * @param {number} [column_length] - 列数
	 * @returns {Matrix}
	 */
	static memset(number, dimension, column_length) {
		if((arguments.length === 0) || (arguments.length > 3)) {
			throw "IllegalArgumentException";
		}
		if((number instanceof Matrix) && (!number.isScalar())) {
			const x = number.matrix_array;
			const x_row_length = number.row_length;
			const x_column_length = number.column_length;
			return Matrix.createMatrixDoEachCalculation(function(row, col) {
				return x[row % x_row_length][col % x_column_length];
			}, dimension, column_length);
		}
		else {
			let x = 0;
			if((number instanceof Matrix) && (number.isScalar())) {
				x = number.scalar;
			}
			else {
				x = Complex.create(number);
			}
			return Matrix.createMatrixDoEachCalculation(function() {
				return x;
			}, dimension, column_length);
		}
	}

	/**
	 * 0で初期化
	 * @param {number} dimension - 次元数
	 * @param {number} [column_length] - 列数
	 * @returns {Matrix}
	 */
	static zeros(dimension, column_length) {
		if((arguments.length === 0) || (arguments.length > 2)) {
			throw "IllegalArgumentException";
		}
		return Matrix.memset(Complex.ZERO, dimension, column_length);
	}

	/**
	 * 1で初期化
	 * @param {number} dimension - 次元数
	 * @param {number} [column_length] - 列数
	 * @returns {Matrix}
	 */
	static ones(dimension, column_length) {
		if((arguments.length === 0) || (arguments.length > 2)) {
			throw "IllegalArgumentException";
		}
		return Matrix.memset(Complex.ONE, dimension, column_length);
	}

	/**
	 * ランダム値で初期化
	 * @param {number} dimension - 次元数
	 * @param {number} [column_length] - 列数
	 * @returns {Matrix}
	 */
	static rand(dimension, column_length) {
		return Matrix.createMatrixDoEachCalculation(function() {
			return Complex.rand();
		}, dimension, column_length);
	}

	/**
	 * 正規分布に従うランダム値で初期化
	 * @param {number} dimension - 次元数
	 * @param {number} [column_length] - 列数
	 * @returns {Matrix}
	 */
	static randn(dimension, column_length) {
		return Matrix.createMatrixDoEachCalculation(function() {
			return Complex.randn();
		}, dimension, column_length);
	}

	/**
	 * 行列なら対角成分を列ベクトル / ベクトルなら対角成分を持つ行列
	 * @returns {Matrix}
	 */
	diag() {
		if(this.isVector()) {
			// 行列を作成
			const M = this;
			return Matrix.createMatrixDoEachCalculation(function(row, col) {
				if(row === col) {
					return M.getComplex(row);
				}
				else {
					return Complex.ZERO;
				}
			}, this.length);
		}
		else {
			// 列ベクトルを作成
			const len = Math.min(this.row_length, this.column_length);
			const y = new Array(len);
			for(let i = 0; i < len; i++) {
				y[i] = new Array(1);
				y[i][0] = this.matrix_array[i][i];
			}
			return new Matrix(y);
		}
	}

	// TODO 行列の結合がほしい

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// 比較や判定
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆

	/**
	 * スカラー値の判定
	 * @returns {boolean}
	 */
	isScalar() {
		return this.row_length === 1 && this.column_length == 1;
	}
	
	/**
	 * 行ベクトル／横ベクトルの判定
	 * @returns {boolean}
	 */
	isRow() {
		return this.row_length === 1;
	}
	
	/**
	 * 列ベクトル／縦ベクトルの判定
	 * @returns {boolean}
	 */
	isColumn() {
		return this.column_length === 1;
	}

	/**
	 * ベクトルの判定
	 * @returns {boolean}
	 */
	isVector() {
		return this.row_length === 1 || this.column_length === 1;
	}

	/**
	 * 行列の判定
	 * @returns {boolean}
	 */
	isMatrix() {
		return this.row_length !== 1 && this.column_length !== 1;
	}

	/**
	 * 正方行列の判定
	 * @returns {boolean}
	 */
	isSquare() {
		return this.row_length === this.column_length;
	}

	/**
	 * 実行列の判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isReal(epsilon) {
		let is_real = true;
		this._each(function(num){
			if(is_real && (num.isComplex(epsilon))) {
				is_real = false;
			}
		});
		return is_real;
	}

	/**
	 * 複素行列の判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isComplex(epsilon) {
		let is_complex = true;
		this._each(function(num){
			if(is_complex && (num.isReal(epsilon))) {
				is_complex = false;
			}
		});
		return is_complex;
	}

	/**
	 * 零行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isZeros(epsilon) {
		let is_zeros = true;
		const tolerance = epsilon ? epsilon : 1.0e-10;
		this._each(function(num){
			if(is_zeros && (!num.isZero(tolerance))) {
				is_zeros = false;
			}
		});
		return is_zeros;
	}

	/**
	 * 単位行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isIdentity(epsilon) {
		if(!this.isDiagonal()) {
			return false;
		}
		const tolerance = epsilon ? epsilon : 1.0e-10;
		for(let row = 0; row < this.row_length; row++) {
			if(!this.matrix_array[row][row].isOne(tolerance)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 対角行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isDiagonal(epsilon) {
		let is_diagonal = true;
		const tolerance = epsilon ? epsilon : 1.0e-10;
		this._each(function(num, row, col){
			if(is_diagonal && (row !== col) && (!num.isZero(tolerance))) {
				is_diagonal = false;
			}
		});
		return is_diagonal;
	}
	
	/**
	 * 三重対角行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isTridiagonal(epsilon) {
		if(!this.isSquare()) {
			return false;
		}
		let is_tridiagonal = true;
		const tolerance = epsilon ? epsilon : 1.0e-10;
		this._each(function(num, row, col){
			if(is_tridiagonal && (Math.abs(row - col) > 1) && (!num.isZero(tolerance))) {
				is_tridiagonal = false;
			}
		});
		return is_tridiagonal;
	}

	/**
	 * 正則行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isRegular(epsilon) {
		if(!this.isSquare()) {
			return false;
		}
		// ランクが行列の次元と等しいかどうかで判定
		// det(M) != 0 でもよいが、時間がかかる可能性があるので
		// 誤差は自動で計算など本当はもうすこし良い方法を考える必要がある
		const tolerance = epsilon ? epsilon : 1.0e-10;
		return (this.rank(1.0e-10).equals(this.row_length, tolerance));
	}

	/**
	 * 直行行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isOrthogonal(epsilon) {
		if(!this.isSquare()) {
			return false;
		}
		const tolerance = epsilon ? epsilon : 1.0e-10;
		return (this.mul(this.transpose()).isIdentity(tolerance));
	}

	/**
	 * ユニタリ行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isUnitary(epsilon) {
		if(!this.isSquare()) {
			return false;
		}
		const tolerance = epsilon ? epsilon : 1.0e-10;
		return (this.mul(this.ctranspose()).isIdentity(tolerance));
	}

	/**
	 * 対称行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isSymmetric(epsilon) {
		if(!this.isSquare()) {
			return false;
		}
		const tolerance = epsilon ? epsilon : 1.0e-10;
		for(let row = 0; row < this.row_length; row++) {
			for(let col = row + 1; col < this.column_length; col++) {
				if(!this.matrix_array[row][col].equals(this.matrix_array[col][row], tolerance)) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * エルミート行列を判定
	 * @param {number} [epsilon] - 誤差
	 * @returns {boolean}
	 */
	isHermitian(epsilon) {
		if(!this.isSquare()) {
			return false;
		}
		const tolerance = epsilon ? epsilon : 1.0e-10;
		for(let row = 0; row < this.row_length; row++) {
			for(let col = row; col < this.column_length; col++) {
				if(row === col) {
					if(!this.matrix_array[row][col].isReal(tolerance)) {
						return false;
					}
				}
				else if(!this.matrix_array[row][col].equals(this.matrix_array[col][row].conj(), tolerance)) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * A.size() = [row_length column_length] 行列のサイズを取得
	 * @returns {Matrix} 行ベクトル [row_length column_length]
	 */
	size() {
		// 行列のサイズを取得
		return new Matrix([[this.row_length, this.column_length]]);
	}

	/**
	 * A.compareTo(B) 今の値Aと、指定した値Bとを比較する
	 * スカラー同士の場合の戻り値は、IF文で利用できるように、number型である。
	 * 行列同士の場合は行列の中で比較を行い、各項に比較結果が入る
	 * @param {Matrix} number 
	 * @param {number} [epsilon] - 誤差
	 * @returns {number|Matrix} A < B ? 1 : (A === B ? 0 : -1)
	 */
	compareTo(number, epsilon) {
		const M1 = this;
		const M2 = Matrix.create(number);
		// ※スカラー同士の場合は、実数を返す
		if(M1.isScalar() && M2.isScalar()) {
			return M1.scalar.compareTo(M2.scalar, epsilon);
		}
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		const y_row_length = Math.max(M1.row_length, M2.row_length);
		const y_column_length = Math.max(M1.column_length, M2.column_length);
		return Matrix.createMatrixDoEachCalculation(function(row, col) {
			return x1[row % M1.row_length][col % M1.column_length].compareTo(x2[row % M2.row_length][col % M2.column_length]);
		}, y_row_length, y_column_length);
	}

	/**
	 * A.max() 行列内の最大値ベクトル、ベクトル内の最大スカラー値を取得
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	max(epsilon) {
		const main = function(data) {
			let x = data[0];
			for(let i = 1; i < data.length; i++) {
				if(x.compareTo(data[i], epsilon) > 0) {
					x = data[i];
				}
			}
			return [x];
		};
		return this.__column_oriented_1_dimensional_processing(main);
	}
	
	/**
	 * A.min() 行列内の最小値ベクトル、ベクトル内の最小スカラー値を取得
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	min(epsilon) {
		const main = function(data) {
			let x = data[0];
			for(let i = 1; i < data.length; i++) {
				if(x.compareTo(data[i], epsilon) < 0) {
					x = data[i];
				}
			}
			return [x];
		};
		return this.__column_oriented_1_dimensional_processing(main);
	}

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// 四則演算
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	
	/**
	 * A.add(B) = A + B
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	add(number) {
		const M1 = this;
		const M2 = Matrix.create(number);
		if((M1.row_length !== M2.row_length) && (M1.column_length !== M2.column_length)) {
			throw "Matrix size does not match";
		}
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		const y_row_length = Math.max(M1.row_length, M2.row_length);
		const y_column_length = Math.max(M1.column_length, M2.column_length);
		return Matrix.createMatrixDoEachCalculation(function(row, col) {
			return x1[row % M1.row_length][col % M1.column_length].add(x2[row % M2.row_length][col % M2.column_length]);
		}, y_row_length, y_column_length);
	}

	/**
	 * A.sub(B) = A - B
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	sub(number) {
		const M1 = this;
		const M2 = Matrix.create(number);
		if((M1.row_length !== M2.row_length) && (M1.column_length !== M2.column_length)) {
			throw "Matrix size does not match";
		}
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		const y_row_length = Math.max(M1.row_length, M2.row_length);
		const y_column_length = Math.max(M1.column_length, M2.column_length);
		return Matrix.createMatrixDoEachCalculation(function(row, col) {
			return x1[row % M1.row_length][col % M1.column_length].sub(x2[row % M2.row_length][col % M2.column_length]);
		}, y_row_length, y_column_length);
	}

	/**
	 * A.mul(B) = A * B
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	mul(number) {
		const M1 = this;
		const M2 = Matrix.create(number);
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		if(M1.isScalar() && M2.isScalar()) {
			return new Matrix(x1.scalar.mul(x2.scalar));
		}
		if(M1.isScalar()) {
			const y = new Array(M2.row_length);
			for(let row = 0; row < M2.row_length; row++) {
				y[row] = new Array(M2.column_length);
				for(let col = 0; col < M2.column_length; col++) {
					y[row][col] = M1.scalar.mul(x2[row][col]);
				}
			}
			return new Matrix(y);
		}
		else if(M2.isScalar()) {
			const y = new Array(M1.row_length);
			for(let row = 0; row < M1.row_length; row++) {
				y[row] = new Array(M1.column_length);
				for(let col = 0; col < M1.column_length; col++) {
					y[row][col] = x1[row][col].mul(M2.scalar);
				}
			}
			return new Matrix(y);
		}
		if(M1.column_length !== M2.row_length) {
			throw "Matrix size does not match";
		}
		{
			const y = new Array(M1.row_length);
			for(let row = 0; row < M1.row_length; row++) {
				y[row] = new Array(M2.column_length);
				for(let col = 0; col < M2.column_length; col++) {
					let sum = Complex.ZERO;
					for(let i = 0; i < M1.column_length; i++) {
						sum = sum.add(x1[row][i].mul(x2[i][col]));
					}
					y[row][col] = sum;
				}
			}
			return new Matrix(y);
		}
	}

	/**
	 * A.inv() = 単位行列 / A
	 * @returns {Matrix}
	 */
	inv() {
		if(this.isScalar()) {
			return new Matrix(Complex.ONE.div(this.scalar));
		}
		if(!this.isSquare()) {
			throw "not square";
		}
		if(this.isDiagonal()) {
			// 対角行列の場合は、対角成分のみ逆数をとる
			const y = this.T();
			const size = Math.min(y.row_length, y.column_length);
			for(let i = 0; i < size; i++) {
				y.matrix_array[i][i] = y.matrix_array[i][i].inv();
			}
			return y;
		}
		// (ここで正規直交行列の場合なら、転置させるなど入れてもいい？判定はできないけども)
		const len = this.column_length;
		// ガウス・ジョルダン法
		// 初期値の設定
		const M = new Matrix(this);
		M._concat_left(Matrix.eye(len));
		const long_matrix_array = M.matrix_array;
		const long_length = M.column_length;

		//前進消去
		for(let k = 0; k < len; k++) {
			//ピポットの選択
			{
				// k列目で最も大きな行を取得(k列目から調べる)
				const row_num = M._max_row_number(k, k).index;
				//交換を行う
				M._exchange_row(k, row_num);
			}
			//ピポットの正規化
			{
				const normalize_value = long_matrix_array[k][k].inv();
				for(let row = k, col = k; col < long_length; col++) {
					long_matrix_array[row][col] = long_matrix_array[row][col].mul(normalize_value);
				}
			}
			//消去
			for(let row = 0;row < len; row++) {
				if(row === k) {
					continue;
				}
				const temp = long_matrix_array[row][k];
				for(let col = k; col < long_length; col++)
				{
					long_matrix_array[row][col] = long_matrix_array[row][col].sub(long_matrix_array[k][col].mul(temp));
				}
			}
		}

		const y = new Array(len);
		//右の列を抜き取る
		for(let row = 0; row < len; row++) {
			y[row] = new Array(len);
			for(let col = 0; col < len; col++) {
				y[row][col] = long_matrix_array[row][len + col];
			}
		}

		return new Matrix(y);
	}

	/**
	 * A.div(B) = A / B
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	div(number) {
		const M1 = this;
		const M2 = Matrix.create(number);
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		if(M1.isScalar() && M2.isScalar()) {
			return new Matrix(x1.scalar.div(x2.scalar));
		}
		if(M2.isScalar()) {
			const y = new Array(M1.row_length);
			for(let row = 0; row < M1.row_length; row++) {
				y[row] = new Array(M1.column_length);
				for(let col = 0; col < M1.column_length; col++) {
					y[row][col] = x1[row][col].div(M2.scalar);
				}
			}
			return new Matrix(y);
		}
		if(M2.row_length === M2.column_length) {
			// ランク落ちしているか確認していないため注意
			// 本来ランク落ちしている場合は、ここでpinvを使用した方法に切り替えるなどする必要がある。
			return this.mul(M2.inv());
		}
		if(M1.column_length !== M2.column_length) {
			throw "Matrix size does not match";
		}
		
		throw "warning";
	}

	/**
	 * A.nmul(B) = A .* B 各項ごとの掛け算
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	nmul(number) {
		const M1 = this;
		const M2 = Matrix.create(number);
		if((M1.row_length !== M2.row_length) && (M1.column_length !== M2.column_length)) {
			throw "Matrix size does not match";
		}
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		const y_row_length = Math.max(M1.row_length, M2.row_length);
		const y_column_length = Math.max(M1.column_length, M2.column_length);
		return Matrix.createMatrixDoEachCalculation(function(row, col) {
			return x1[row % M1.row_length][col % M1.column_length].mul(x2[row % M2.row_length][col % M2.column_length]);
		}, y_row_length, y_column_length);
	}

	/**
	 * A.ndiv(B) = A ./ B 各項ごとの割り算
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	ndiv(number) {
		const M1 = this;
		const M2 = Matrix.create(number);
		if((M1.row_length !== M2.row_length) && (M1.column_length !== M2.column_length)) {
			throw "Matrix size does not match";
		}
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		const y_row_length = Math.max(M1.row_length, M2.row_length);
		const y_column_length = Math.max(M1.column_length, M2.column_length);
		return Matrix.createMatrixDoEachCalculation(function(row, col) {
			return x1[row % M1.row_length][col % M1.column_length].div(x2[row % M2.row_length][col % M2.column_length]);
		}, y_row_length, y_column_length);
	}

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// Complexのメソッドにある機能を行列で使用できるようにしたもの
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆

	/**
	 * 各項の実部
	 * @returns {Matrix}
	 */
	real() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return new Complex(num.real);
		});
	}
	
	/**
	 * 各項の虚部
	 * @returns {Matrix}
	 */
	imag() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return new Complex(num.imag);
		});
	}

	/**
	 * 各項の偏角（極座標の角度）
	 * @returns {Matrix}
	 */
	angle() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return new Complex(num.angle);
		});
	}

	/**
	 * 各項の符号値
	 * @returns {Matrix}
	 */
	sign() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return new Complex(num.sign());
		});
	}

	/**
	 * 各項の整数を判定(1 or 0)
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	testInteger(epsilon) {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isInteger(epsilon) ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * 各項の複素整数を判定(1 or 0)
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	testComplexInteger(epsilon) {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isComplexInteger(epsilon) ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * 各項の 0 を判定(1 or 0)
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	testZero(epsilon) {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isZero(epsilon) ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * 各項の 1 を判定(1 or 0)
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	testOne(epsilon) {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isOne(epsilon) ? Complex.ONE : Complex.ZERO;
		});
	}
	
	/**
	 * 各項の複素数を判定(1 or 0)
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	testComplex(epsilon) {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isComplex(epsilon) ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * 各項の実数を判定(1 or 0)
	 * @param {number} [epsilon] - 誤差
	 * @returns {Matrix}
	 */
	testReal(epsilon) {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isReal(epsilon) ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * 各項の非数を判定(1 or 0)
	 * @returns {Matrix}
	 */
	testNaN() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isNaN() ? Complex.ONE : Complex.ZERO;
		});
	}


	/**
	 * real(x) > 0
	 * @returns {boolean}
	 */
	testPositive() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isPositive() ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * real(x) < 0
	 * @returns {boolean}
	 */
	testNegative() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isNegative() ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * real(x) >= 0
	 * @returns {boolean}
	 */
	testNotNegative() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isNotNegative() ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * 各項の無限を判定
	 * @returns {boolean}
	 */
	testInfinite() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isInfinite() ? Complex.ONE : Complex.ZERO;
		});
	}
	
	/**
	 * 各項の有限数を判定
	 * @returns {boolean}
	 */
	testFinite() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.isFinite() ? Complex.ONE : Complex.ZERO;
		});
	}

	/**
	 * 各項の絶対値をとる
	 * @returns {Matrix}
	 */
	abs() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.abs();
		});
	}

	/**
	 * 複素共役行列
	 * @returns {Matrix}
	 */
	conj() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.conj();
		});
	}

	/**
	 * 各項に -1 を掛け算する
	 * @returns {Matrix}
	 */
	negate() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.negate();
		});
	}

	/**
	 * 各項に sqrt()
	 * @returns {Matrix}
	 */
	sqrt() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.sqrt();
		});
	}

	/**
	 * 各項に pow(x)
	 * @param {Matrix} number - スカラー
	 * @returns {Matrix}
	 */
	pow(number) {
		const M = Matrix.create(number);
		if(!M.isScalar()) {
			throw "not set Scalar";
		}
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.pow(M.scalar);
		});
	}

	/**
	 * 各項に log()
	 * @returns {Matrix}
	 */
	log() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.log();
		});
	}

	/**
	 * 各項に exp()
	 * @returns {Matrix}
	 */
	exp() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.exp();
		});
	}

	/**
	 * 各項に sin()
	 * @returns {Matrix}
	 */
	sin() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.sin();
		});
	}

	/**
	 * 各項に cos()
	 * @returns {Matrix}
	 */
	cos() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.cos();
		});
	}

	/**
	 * 各項に tan()
	 * @returns {Matrix}
	 */
	tan() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.tan();
		});
	}
	
	/**
	 * 各項に atan()
	 * @returns {Matrix}
	 */
	atan() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.atan();
		});
	}

	/**
	 * 各項に atan2()
	 * @param {Matrix} number - スカラー
	 * @returns {Matrix}
	 */
	atan2(number) {
		const M = Matrix.create(number);
		if(!M.isScalar) {
			throw "not set Scalar";
		}
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.atan2(M.scalar);
		});
	}

	/**
	 * 各項に floor()
	 * @returns {Matrix}
	 */
	floor() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.floor();
		});
	}

	/**
	 * 各項に ceil()
	 * @returns {Matrix}
	 */
	ceil() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.ceil();
		});
	}

	/**
	 * 各項に round()
	 * @returns {Matrix}
	 */
	round() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.round();
		});
	}

	/**
	 * 各項に fix()
	 * @returns {Matrix}
	 */
	fix() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.fix();
		});
	}

	/**
	 * 各項に fract()
	 * @returns {Matrix}
	 */
	fract() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.fract();
		});
	}

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// 行列の計算でよく使用する処理。
	// メソッド内部の処理を記述する際に使用している。
	// 他から使用する場合は注意が必要である。
	// 前提条件があるメソッド、ミュータブルとなっている。
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆

	/**
	 * 行列を時計回りに回転させます。ミュータブルです。
	 * 内部処理用
	 * @param {number} count - 回転する回数
	 * @returns {Matrix} 処理実行後の行列
	 */
	_rot90(count) {
		let rot_type = 1;
		if(arguments.length === 1) {
			rot_type = ((count % 4) + 4) % 4;
		}
		if(rot_type === 0) {
			return this;
		}
		// バックアップ
		const x = new Array(this.row_length);
		for(let i = 0; i < this.row_length; i++) {
			x[i] = new Array(this.column_length);
			for(let j = 0; j < this.column_length; j++) {
				x[i][j] = this.matrix_array[i][j];
			}
		}
		const y = this.matrix_array;
		if(rot_type === 1) {
			// 90度回転
			y.splice(this.column_length);
			for(let col = 0; col < this.column_length; col++) {
				if(col < this.row_length) {
					y[col].splice(this.row_length);
				}
				else {
					y[col] = new Array(this.row_length);
				}
				for(let row = 0; row < this.row_length; row++) {
					y[col][row] = x[this.row_length - row - 1][col];
				}
			}
		}
		else if(rot_type === 2) {
			// 180度回転
			for(let row = 0; row < this.row_length; row++) {
				for(let col = 0; col < this.column_length; col++) {
					y[row][col] = x[this.row_length - row - 1][this.column_length - col - 1];
				}
			}
		}
		else if(rot_type === 3) {
			// 270度回転
			y.splice(this.column_length);
			for(let col = 0; col < this.column_length; col++) {
				if(col < this.row_length) {
					y[col].splice(this.row_length);
				}
				else {
					y[col] = new Array(this.row_length);
				}
				for(let row = 0; row < this.row_length; row++) {
					y[col][row] = x[row][this.column_length - col - 1];
				}
			}
		}
		this.row_length = y.length;
		this.column_length = y[0].length;
		this._clearCash();
		return this;
	}

	/**
	 * 行列を拡張します。ミュータブルです。
	 * 拡張した場合は、0を初期値にします。
	 * 内部処理用
	 * @param {number} row_length - 新しい行の長さ
	 * @param {number} column_length - 新しい列の長さ
	 * @returns {Matrix} 処理実行後の行列
	 */
	_resize(row_length, column_length) {
		if((row_length === this.row_length) && (column_length === this.column_length)) {
			return this;
		}
		if((row_length <= 0) || (column_length <= 0)) {
			throw "_resize";
		}
		const row_max = Math.max(this.row_length, row_length);
		const col_max = Math.max(this.column_length, column_length);
		const y = this.matrix_array;
		// 大きくなった行と列に対してゼロで埋める
		for(let row = 0; row < row_max; row++) {
			if(row >= this.row_length) {
				y[row] = new Array(col_max);
			}
			for(let col = 0; col < col_max; col++) {
				if((row >= this.row_length) || (col >= this.column_length)) {
					y[row][col] = Complex.ZERO;
				}
			}
		}
		// 小さくなった行と列を削除する
		if(this.row_length > row_length) {
			y.splice(row_length);
		}
		if(this.column_length > column_length) {
			for(let row = 0; row < y.length; row++) {
				y[row].splice(column_length);
			}
		}
		this.row_length = row_length;
		this.column_length = column_length;
		this._clearCash();
		return this;
	}

	/**
	 * 行を消去します。ミュータブルです。
	 * 内部処理用
	 * @param {number} row_index - 行番号
	 * @returns {Matrix} 処理実行後の行列
	 */
	_delete_row(row_index) {
		if((this.row_length === 1) || (this.row_length <= row_index)) {
			throw "_delete_row";
		}
		this.matrix_array.splice(row_index, 1);
		this.row_length--;
		this._clearCash();
		return this;
	}
	
	/**
	 * 列を消去します。ミュータブルです。
	 * 内部処理用
	 * @param {number} column_index - 列番号
	 * @returns {Matrix} 処理実行後の行列
	 */
	_delete_column(column_index) {
		if((this.column_length === 1) || (this.column_length <= column_index)) {
			throw "_delete_column";
		}
		for(let row = 0; row < this.row_length; row++) {
			this.matrix_array[row].splice(column_index, 1);
		}
		this.column_length--;
		this._clearCash();
		return this;
	}

	/**
	 * 行を交換します。ミュータブルです。
	 * 内部処理用
	 * @param {number} row_index1 - 行番号1
	 * @param {number} row_index2 - 行番号2
	 * @returns {Matrix} 処理実行後の行列
	 */
	_exchange_row(row_index1, row_index2) {
		if((this.row_length === 1) || (this.row_length <= row_index1) || (this.row_length <= row_index2)) {
			throw "_exchange_row";
		}
		if(row_index1 === row_index2) {
			return this;
		}
		const swap = this.matrix_array[row_index1];
		this.matrix_array[row_index1] = this.matrix_array[row_index2];
		this.matrix_array[row_index2] = swap;
		this._clearCash();
		return this;
	}

	/**
	 * 行を交換します。ミュータブルです。
	 * 内部処理用
	 * @param {number} column_index1 - 行番号1
	 * @param {number} column_index2 - 行番号2
	 * @returns {Matrix} 処理実行後の行列
	 */
	_exchange_column(column_index1, column_index2) {
		if((this.column_length === 1) || (this.column_length <= column_index1) || (this.column_length <= column_index2)) {
			throw "_exchange_column";
		}
		if(column_index1 === column_index2) {
			return this;
		}
		for(let row = 0; row < this.row_length; row++) {
			const swap = this.matrix_array[row][column_index1];
			this.matrix_array[row][column_index1] = this.matrix_array[row][column_index2];
			this.matrix_array[row][column_index2] = swap;
		}
		this._clearCash();
		return this;
	}

	/**
	 * 行列の右に行列をくっつけます。ミュータブルです。
	 * 内部処理用
	 * @param {Matrix} left_matrix - 結合したい行列
	 * @returns {Matrix} 処理実行後の行列
	 */
	_concat_left(left_matrix) {
		const M = Matrix.create(left_matrix);
		for(let row = 0; row < this.row_length; row++) {
			for(let col = 0; col < M.column_length; col++) {
				this.matrix_array[row].push(M.matrix_array[row][col]);
			}
		}
		this.column_length += M.column_length;
		this._clearCash();
		return this;
	}

	/**
	 * 行列の下に行列をくっつけます。ミュータブルです。
	 * 内部処理用
	 * @param {Matrix} bottom_matrix - 結合したい行列
	 * @returns {Matrix} 処理実行後の行列
	 */
	_concat_bottom(bottom_matrix) {
		const M = Matrix.create(bottom_matrix);
		for(let row = 0; row < M.row_length; row++) {
			this.matrix_array.push(M.matrix_array[row]);
		}
		this.row_length += M.row_length;
		this._clearCash();
		return this;
	}

	/**
	 * 列の中で最もノルムが最大の値がある行番号を返します。ミュータブルです。
	 * 内部処理用
	 * @param {number} column_index - 列番号
	 * @param {number} row_index_offset - 行のオフセット(この値から行う)
	 * @param {number} row_index_max - 行の最大(この値は含めない)
	 * @returns {number} 行番号
	 */
	_max_row_number(column_index, row_index_offset, row_index_max) {
		let row_index = 0;
		let row_max = 0;
		let row = row_index_offset ? row_index_offset : 0;
		const row_imax = row_index_max ? row_index_max : this.row_length;
		// n列目で最も大きな行を取得
		for(; row < row_imax; row++) {
			const norm = this.matrix_array[row][column_index].norm;
			if(norm > row_max) {
				row_max = norm;
				row_index = row;
			}
		}
		return {
			index : row_index,
			max : row_max
		};
	}

	/**
	 * 行列の各行をベクトルと見立て、線型従属している行を抽出する
	 * 内部処理用
	 * @param {number} [epsilon=1.0e-10] - 誤差
	 * @returns {Array} 行番号の行列(昇順)
	 */
	_get_linear_dependence_vector(epsilon) {
		const M = new Matrix(this);
		const m = M.matrix_array;
		const tolerance = epsilon ? epsilon : 1.0e-10;
		// 確認する行番号（ここから終わった行は削除していく）
		const row_index_array = new Array(this.row_length);
		for(let i = 0; i < this.row_length; i++) {
			row_index_array[i] = i;
		}
		// ガウスの消去法を使用して、行ベクトルを抽出していく
		for(let col_target = 0; col_target < M.column_length; col_target++) {
			let row_max_index = 0;
			{
				let row_max = 0;
				let row_max_key = 0;
				// n列目で絶対値が最も大きな行を取得
				for(const row_key in row_index_array) {
					const row = row_index_array[row_key];
					const norm = m[row][col_target].norm;
					if(norm > row_max) {
						row_max = norm;
						row_max_key = row_key;
						row_max_index = row;
					}
				}
				// 大きいのが0である＝その列は全て0である
				if(row_max <= tolerance) {
					continue;
				}
				// 大きな値があった行は、リストから除去する
				row_index_array.splice(row_max_key, 1);
				if(col_target === M.column_length - 1) {
					break;
				}
			}
			// 次の列から、大きな値があった行の成分を削除
			for(const row_key in row_index_array) {
				const row = row_index_array[row_key];
				const inv = m[row][col_target].div(m[row_max_index][col_target]);
				for(let col = col_target; col < M.column_length; col++) {
					m[row][col] = m[row][col].sub(m[row_max_index][col].mul(inv));
				}
			}
		}
		return row_index_array;
	}

	/**
	 * 行列をベクトルと見立て、正規直行化し、QとRの行列を作る
	 * 内部処理用
	 * @param {Matrix} M_ - 正方行列
	 * @returns {Object<string, Matrix>}
	 */
	static _gram_schmidt_orthonormalization(M_) {
		// グラム・シュミットの正規直交化法を使用する
		// 参考：Gilbert Strang (2007). Computational Science and Engineering.

		const M = Matrix.create(M_);
		const len = M.column_length;
		const A = M.matrix_array;
		const Q_Matrix = Matrix.zeros(len);
		const R_Matrix = Matrix.zeros(len);
		const Q = Q_Matrix.matrix_array;
		const R = R_Matrix.matrix_array;
		const non_orthogonalized = [];
		const a = new Array(len);
		
		for(let col = 0; col < len; col++) {
			// i列目を抽出
			for(let row = 0; row < len; row++) {
				a[row] = A[row][col];
			}
			// 直行ベクトルを作成
			if(col > 0) {
				// Rのi列目を内積で計算する
				for(let j = 0; j < col; j++) {
					for(let k = 0; k < len; k++) {
						R[j][col] = R[j][col].add(A[k][col].dot(Q[k][j]));
					}
				}
				for(let j = 0; j < col; j++) {
					for(let k = 0; k < len; k++) {
						a[k] = a[k].sub(R[j][col].mul(Q[k][j]));
					}
				}
			}
			{
				// 正規化と距離を1にする
				for(let j = 0; j < len; j++) {
					R[col][col] = R[col][col].add(a[j].mul(a[j]));
				}
				R[col][col] = R[col][col].sqrt();
				if(R[col][col].isZero(1e-10)) {
					// 直行化が不可能だった列の番号をメモして、その列はゼロで埋める
					non_orthogonalized.push(col);
					for(let j = 0;j < len;j++) {
						Q[j][col] = Complex.ZERO;
					}
				}
				else {
					// ここで R[i][i] === 0 の場合、直行させたベクトルaは0であり、
					// ランク落ちしており、計算不可能である。
					// 0割りした値を、j列目のQに記録していくがInfとなる。
					for(let j = 0;j < len;j++) {
						Q[j][col] = a[j].div(R[col][col]);
					}
				}
			}
		}
		return {
			Q : Q_Matrix,
			R : R_Matrix,
			non_orthogonalized : non_orthogonalized
		};
	}
	
	/**
	 * 行列の全行ベクトルに対して、直行したベクトルを作成する
	 * @param {number} [epsilon=1.0e-10] - 誤差
	 * @returns {Matrix} 直行したベクトルがなければNULLを返す
	 */
	_createOrthogonalVector(epsilon) {
		const M = new Matrix(this);
		const m = M.matrix_array;
		const tolerance = epsilon ? epsilon : 1.0e-10;
		// 正則行列をなす場合に問題となる行番号を取得
		const not_regular_rows = M._get_linear_dependence_vector(tolerance);
		// 不要な行を削除する
		{
			// not_regular_rowsは昇順リストなので、後ろから消していく
			for(let i = not_regular_rows.length - 1; i >= 0; i--) {
				m.splice(not_regular_rows[i], 1);
				M.row_length--;
			}
		}
		// 追加できるベクトルの数
		const add_vectors = this.column_length - m.length;
		if(add_vectors <= 0) {
			return null;
		}
		// ランダムベクトル（seed値は毎回同一とする）
		const noise = new Random(0);
		let orthogonal_matrix = null;
		for(let i = 0; i < 100; i++) {
			// 直行ベクトルを作るために、いったん行と列を交換する
			// これは、グラム・シュミットの正規直交化法が列ごとに行う手法のため。
			const M2 = M.T();
			// ランダム行列を作成する
			const R = Matrix.createMatrixDoEachCalculation(function() {
				return new Complex(noise.nextGaussian());
			}, M2.row_length, add_vectors);
			// 列に追加する
			M2._concat_left(R);
			// 正規直行行列を作成する
			orthogonal_matrix = Matrix._gram_schmidt_orthonormalization(M2);
			// 正しく作成できていたら完了
			if(orthogonal_matrix.non_orthogonalized.length === 0) {
				break;
			}
		}
		if(orthogonal_matrix.non_orthogonalized.length !== 0) {
			// 普通は作成できないことはないが・・・
			console.log("miss");
			return null;
		}
		// 作成した列を切り出す
		const y = new Array(add_vectors);
		const q = orthogonal_matrix.Q.matrix_array;
		for(let row = 0; row < add_vectors; row++) {
			y[row] = new Array(this.column_length);
			for(let col = 0; col < this.column_length; col++) {
				y[row][col] = q[col][this.column_length - add_vectors + row];
			}
		}
		return new Matrix(y);
	}

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// 行列の一般計算
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆

	/**
	 * 行列のpノルム
	 * @returns {number}
	 */
	norm(p) {
		if(arguments.length === 0) {
			return this.norm2;
		}
		if(p === 1) {
			return this.norm1;
		}
		else if(p === 2) {
			return this.norm2;
		}
		else if((p === Number.POSITIVE_INFINITY) || (p === Number.NEGATIVE_INFINITY)) {
			const y = this.matrix_array;
			let compare = p === Number.POSITIVE_INFINITY ? 0 : Number.POSITIVE_INFINITY;
			// 行を固定して列の和を計算
			for(let row = 0; row < this.row_length; row++) {
				let sum = 0.0;
				for(let col = 0; col < this.column_length; col++) {
					sum += y[row][col].norm;
				}
				if(p === Number.POSITIVE_INFINITY) {
					compare = Math.max(compare, sum);
				}
				else {
					compare = Math.min(compare, sum);
				}
			}
			return compare;
		}
		if(this.isVector()) {
			// 一般化ベクトルpノルム
			let sum = 0.0;
			for(let i = 0; i < this.length; i++) {
				sum = Math.pow(this.getComplex(i).norm, p);
			}
			return Math.pow(sum, 1.0 / p);
		}
		// 未実装
		throw "norm";
	}

	/**
	 * A.inner(B) = ドット積（内積）
	 * @param {Matrix} number 
	 * @param {number} [dimension=1] 計算するときに使用する次元（1 or 2）
	 * @returns {Matrix}
	 */
	inner(number, dimension) {
		const M1 = this;
		const M2 = Matrix.create(number);
		const x1 = M1.matrix_array;
		const x2 = M2.matrix_array;
		const dim = dimension ? dimension : 1;
		if(M1.isScalar() && M2.isScalar()) {
			return new Matrix(M1.scalar.dot(M2.scalar));
		}
		if(M1.isVector() && M2.isVector()) {
			let sum = Complex.ZERO;
			for(let i = 0; i < M1.length; i++) {
				sum = sum.add(M1.getComplex(i).dot(M2.getComplex(i)));
			}
			return new Matrix(sum);
		}
		if((M1.row_length !== M2.row_length) || (M1.column_length !== M2.column_length)) {
			throw "Matrix size does not match";
		}
		if(dim === 1) {
			const y = new Array(1);
			y[0] = new Array(M1.column_length);
			for(let col = 0; col < M1.column_length; col++) {
				let sum = Complex.ZERO;
				for(let row = 0; row < M1.row_length; row++) {
					sum = sum.add(x1[row][col].dot(x2[row][col]));
				}
				y[0][col] = sum;
			}
			return new Matrix(y);
		}
		else if(dim === 2) {
			const y = new Array(M1.row_length);
			for(let row = 0; row < M1.row_length; row++) {
				let sum = Complex.ZERO;
				for(let col = 0; col < M1.column_length; col++) {
					sum = sum.add(x1[row][col].dot(x2[row][col]));
				}
				y[row] = [sum];
			}
			return new Matrix(y);
		}
		else {
			throw "dim";
		}
	}
	
	/**
	 * 行列のランク
	 * @param {number} [epsilon] - 誤差
	 * @returns {number}
	 */
	rank(epsilon) {
		return Math.abs(this.row_length, this.column_length) - (this._get_linear_dependence_vector(epsilon)).length;
	}

	/**
	 * 転置行列
	 * @returns {Matrix}
	 */
	transpose() {
		const y = new Array(this.column_length);
		for(let col = 0; col < this.column_length; col++) {
			y[col] = new Array(this.row_length);
			for(let row = 0; row < this.row_length; row++) {
				y[col][row] = this.matrix_array[row][col];
			}
		}
		return new Matrix(y);
	}

	/**
	 * エルミート転置行列
	 * @returns {Matrix}
	 */
	ctranspose() {
		return this.transpose().conj();
	}

	/**
	 * エルミート転置行列
	 * @returns {Matrix}
	 */
	T() {
		return this.ctranspose();
	}

	/**
	 * A.det() = [A] 行列式
	 * @returns {Matrix}
	 */
	det() {
		if(!this.isSquare()) {
			throw "not square";
		}
		const M = this.matrix_array;
		const calcDet = function(x) {
			if(x.length === 2) {
				// 2次元の行列式になったら、たすき掛け計算する
				return x[0][0].mul(x[1][1]).sub(x[0][1].mul(x[1][0]));
			}
			let y = Complex.ZERO;
			for(let i = 0; i < x.length; i++) {
				// N次元の行列式を、N-1次元の行列式に分解していく
				const D = [];
				const a = x[i][0];
				for(let row = 0, D_low = 0; row < x.length; row++) {
					if(i === row) {
						continue;
					}
					D[D_low] = [];
					for(let col = 1, D_col = 0; col < x.length; col++, D_col++) {
						D[D_low][D_col] = x[row][col];
					}
					D_low++;
				}
				if((i % 2) === 0) {
					y = y.add(a.mul(calcDet(D)));
				}
				else {
					y = y.sub(a.mul(calcDet(D)));
				}
			}
			return y;
		};
		return new Matrix(calcDet(M));
	}

	/**
	 * A.lup() = P'*L*U = A となる P,L,Uを解く
	 * @returns {Object<string, Matrix>} {P, L, U}
	 */
	lup() {
		const L = Matrix.zeros(this.row_length);
		const U = new Matrix(this);
		const P = Matrix.eye(this.row_length);
		const l = L.matrix_array;
		const u = U.matrix_array;
		// ガウスの消去法で連立1次方程式の未知数を求める
		//前進消去
		for(let k = 0; k < this.column_length; k++) {
			// ピポットの選択
			let pivot;
			{
				// k列目で最も大きな行を取得(k列目から調べる)
				const max_row_number = U._max_row_number(k, k);
				pivot = max_row_number.index;
				if(max_row_number.max === 0.0) {
					continue;
				}
				//交換を行う
				if(k !== pivot) {
					L._exchange_row(k, pivot);
					U._exchange_row(k, pivot);
					P._exchange_row(k, pivot);
				}
			}
			// 消去
			for(let row = k + 1;row < this.row_length; row++) {
				const temp = u[row][k].div(u[k][k]);
				l[row][k] = temp;
				//lの値だけ行交換が必要？
				for(let col = k; col < this.column_length; col++) {
					u[row][col] = u[row][col].sub(u[k][col].mul(temp));
				}
			}
		}
		L._resize(this.row_length, Math.min(this.row_length, this.column_length));
		U._resize(Math.min(this.row_length, this.column_length), this.column_length);
		// L の対角線に1を代入
		L._each(function(num, row, col) {
			return row === col ? Complex.ONE : num;
		});
		return {
			L : L,
			U : U,
			P : P
		};
	}

	/**
	 * A.linsolve(B) = Ax = B となる xを解く
	 * @param {Matrix} number 
	 * @returns {Matrix}
	 */
	linsolve(number) {
		if(!this.isSquare()) {
			throw "Matrix size does not match";
		}
		// 連立一次方程式を解く
		const len = this.column_length;
		const arg = Matrix.create(number);
		if((arg.row_length !== this.row_length) || (arg.column_length > 1)) {
			throw "Matrix size does not match";
		}
		// 行列を準備する
		const M = new Matrix(this);
		M._concat_left(arg);
		const long_matrix_array = M.matrix_array;
		const long_length = M.column_length;
		// ガウスの消去法で連立1次方程式の未知数を求める
		//前進消去
		for(let k = 0; k < (len - 1); k++) {
			//ピポットの選択
			{
				// k列目で最も大きな行を取得(k列目から調べる)
				const row_num = M._max_row_number(k, k).index;
				//交換を行う
				M._exchange_row(k, row_num);
			}
			//ピポットの正規化
			{
				const normalize_value = long_matrix_array[k][k].inv();
				for(let row = k, col = k; col < long_length; col++) {
					long_matrix_array[row][col] = long_matrix_array[row][col].mul(normalize_value);
				}
			}
			//消去
			for(let row = k + 1;row < len; row++) {
				const temp = long_matrix_array[row][k];
				for(let col = k; col < long_length; col++) {
					long_matrix_array[row][col] = long_matrix_array[row][col].sub(long_matrix_array[k][col].mul(temp));
				}
			}
		}
		//後退代入
		const y = new Array(len);
		y[len - 1] = long_matrix_array[len - 1][len].div(long_matrix_array[len - 1][len - 1]);
		for(let row = len - 2; row >= 0; row--) {
			y[row] = long_matrix_array[row][long_length - 1];
			for(let j = row + 1; j < len; j++) {
				y[row] = y[row].sub(long_matrix_array[row][j] * y[j]);
			}
			y[row] = y[row].div(long_matrix_array[row][row]);
		}
		const y2 = new Array(this.row_length);
		for(let row = 0; row < this.row_length; row++) {
			y2[row] = [y[row]];
		}

		return new Matrix(y2);
	}

	/**
	 * {Q, R} = A.qr() QR分解を行う
	 * @returns {Object<string, Matrix>} {Q, R} Qは正規直行行列、Rは上三角行列
	 */
	qr() {
		// 行列を準備する
		const M = new Matrix(this);
		// 作成後のQとRのサイズ
		const Q_row_length = this.row_length;
		const Q_column_length = this.row_length;
		const R_row_length = this.row_length;
		const R_column_length = this.column_length;
		// 計算時の行と列のサイズ
		const dummy_size = Math.max(this.row_length, this.column_length);
		// 正方行列にする
		M._resize(dummy_size, dummy_size);
		// 正規直行化
		const orthogonal_matrix = Matrix._gram_schmidt_orthonormalization(M);
		// 計算したデータを取得
		const Q_Matrix = orthogonal_matrix.Q;
		const R_Matrix = orthogonal_matrix.R;
		const non_orthogonalized = orthogonal_matrix.non_orthogonalized;
		// Qのサイズを成型する
		if(non_orthogonalized.length !== 0) {
			// 直行化できていない列があるため直行化できてない列以外を抽出
			const map = {};
			for(let i = 0; i < non_orthogonalized.length; i++) {
				map[non_orthogonalized[i]] = 1;
			}
			const orthogonalized = [];
			for(let i = 0; i < dummy_size; i++) {
				if(map[i]) {
					continue;
				}
				const array = [];
				for(let j = 0; j < dummy_size; j++) {
					array[j] = Q_Matrix.matrix_array[j][i];
				}
				orthogonalized.push(array);
			}
			// 直行ベクトルを作成する
			const orthogonal_vector = (new Matrix(orthogonalized))._createOrthogonalVector();
			// 直行化できていない列を差し替える
			for(let i = 0; i < non_orthogonalized.length; i++) {
				const q_col = non_orthogonalized[i];
				for(let j = 0; j < dummy_size; j++) {
					Q_Matrix.matrix_array[j][q_col] = orthogonal_vector.matrix_array[i][j];
				}
			}
		}
		Q_Matrix._resize(Q_row_length, Q_column_length);
		// Rのサイズを成形する
		R_Matrix._resize(R_row_length, R_column_length);
		return {
			Q : Q_Matrix,
			R : R_Matrix
		};
	}

	/**
	 * {P, H} = A.tridiagonalize() 対称行列の三重対角化する P*H*P'=A
	 * @returns {Object<string, Matrix>} {P, H} Hは三重対角行列、Pは正規直行行列。三重対角行列の固有値は元の行列と一致する。
	 */
	tridiagonalize() {
		if(!this.isSquare()) {
			throw "not square matrix";
		}
		if(!this.isSymmetric()) {
			throw "not Symmetric";
		}
		if(this.isComplex()) {
			throw "not Real Matrix";
		}
		return MatrixTool.tridiagonalize(this);
	}

	/**
	 * {V, D} = A.eig() 対称行列の固有値分解 V*D*V'=A
	 * @returns {Object<string, Matrix>} {V, D} Vは右固有ベクトルを列にもつ行列で正規直行行列、Dは固有値を対角成分に持つ行列
	 */
	eig() {
		if(!this.isSquare()) {
			throw "not square matrix";
		}
		if(!this.isSymmetric()) {
			throw "not Symmetric";
		}
		if(this.isComplex()) {
			throw "not Real Matrix";
		}
		return MatrixTool.eig(this);
	}

	/**
	 * {U, S, V} = A.svd() 特異値分解 U*S*V' = A
	 * @returns {Object<string, Matrix>} {U,S,V}
	 */
	svd() {
		if(this.isComplex()) {
			// 複素数が入っている場合は、eig関数が使用できないので非対応
			throw "Unimplemented";
		}
		const rank = this.rank();
		// SVD分解
		// 参考：Gilbert Strang (2007). Computational Science and Engineering.
		const VD = this.T().mul(this).eig();
		const sigma = Matrix.zeros(this.row_length, this.column_length);
		sigma._each(function(num, row, col) {
			if((row === col) && (row < rank)) {
				return VD.D.getComplex(row, row).sqrt();
			}
		});
		const sing = Matrix.createMatrixDoEachCalculation(function(row, col) {
			if(row === col) {
				return sigma.matrix_array[row][row].inv();
			}
			else {
				return Complex.ZERO;
			}
		}, rank);
		const V_rank = (new Matrix(VD.V))._resize(VD.V.row_length, rank);
		const u = this.mul(V_rank).mul(sing);
		const QR = u.qr();
		return {
			U : QR.Q,
			S : sigma,
			V : VD.V
		};
	}

	/**
	 * A.pinv() 疑似逆行列
	 * @returns {Matrix}
	 */
	pinv() {
		const USV = this.svd();
		const U = USV.U;
		const S = USV.S;
		const V = USV.V;
		const sing = Matrix.createMatrixDoEachCalculation(function(row, col) {
			if(row === col) {
				const x = S.matrix_array[row][row];
				if(x.isZero()) {
					return Complex.ZERO;
				}
				else {
					return x.inv();
				}
			}
			else {
				return Complex.ZERO;
			}
		}, this.column_length, this.row_length);
		return V.mul(sing).mul(U.T());
	}

	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// statistics 統計計算用
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆

	// TODO 平均や分散など統計でよく利用するものを作る

	/**
	 * x.gammaln() = gammaln(x) 対数ガンマ関数
	 * @returns {Matrix}
	 */
	gammaln() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.gammaln();
		});
	}

	/**
	 * z.gamma() = gamma(z) ガンマ関数
	 * @returns {Matrix}
	 */
	gamma() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.gamma();
		});
	}

	/**
	 * x.gammainc(a, tail) = gammainc(x, a, tail) 不完全ガンマ関数
	 * @param {Matrix} a
	 * @param {string} [tail="lower"] - lower/upper
	 * @returns {Matrix}
	 */
	gammainc(a, tail) {
		const a_ = Matrix.create(a).scalar;
		const tail_ = arguments.length === 1 ? tail : "lower";
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.gammainc(a_, tail_);
		});
	}

	/**
	 * x.gampdf(k, s) = gampdf(x, k, s) ガンマ分布の確率密度関数
	 * @param {Matrix} k - 形状母数
	 * @param {Matrix} s - 尺度母数
	 * @returns {Matrix}
	 */
	gampdf(k, s) {
		const k_ = Matrix.create(k).scalar;
		const s_ = Matrix.create(s).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.gampdf(k_, s_);
		});
	}

	/**
	 * x.gamcdf(k, s) = gamcdf(x, k, s) ガンマ分布の確率密度関数
	 * @param {Matrix} k - 形状母数
	 * @param {Matrix} s - 尺度母数
	 * @returns {Matrix}
	 */
	gamcdf(k, s) {
		const k_ = Matrix.create(k).scalar;
		const s_ = Matrix.create(s).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.gamcdf(k_, s_);
		});
	}

	/**
	 * p.gaminv(k, s) = gaminv(p, k, s) ガンマ分布の累積分布関数の逆関数
	 * @param {Matrix} k - 形状母数
	 * @param {Matrix} s - 尺度母数
	 * @returns {Matrix}
	 */
	gaminv(k, s) {
		const k_ = Matrix.create(k).scalar;
		const s_ = Matrix.create(s).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.gaminv(k_, s_);
		});
	}

	/**
	 * x.beta(y) = beta(x, y) ベータ関数
	 * @param {Matrix} y
	 * @returns {Matrix}
	 */
	beta(y) {
		const y_ = Matrix.create(y).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.beta(y_);
		});
	}
	
	/**
	 * x.betainc(a, b, tail) = betainc(x, a, b, tail) 不完全ベータ関数
	 * @param {Matrix} a
	 * @param {Matrix} b
	 * @param {string} [tail="lower"] - lower/upper
	 * @returns {Matrix}
	 */
	betainc(a, b, tail) {
		const a_ = Matrix.create(a).scalar;
		const b_ = Matrix.create(b).scalar;
		const tail_ = arguments.length === 2 ? tail : "lower";
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.betainc(a_, b_, tail_);
		});
	}

	/**
	 * x.betacdf(a, b) = betacdf(x, a, b) ベータ分布の確率密度関数
	 * @param {Matrix} a
	 * @param {Matrix} b
	 * @returns {Matrix}
	 */
	betacdf(a, b) {
		const a_ = Matrix.create(a).scalar;
		const b_ = Matrix.create(b).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.betacdf(a_, b_);
		});
	}

	/**
	 * x.betapdf(a, b) = betapdf(x, a, b) ベータ分布の累積分布関数
	 * @param {Matrix} a
	 * @param {Matrix} b
	 * @returns {Matrix}
	 */
	betapdf(a, b) {
		const a_ = Matrix.create(a).scalar;
		const b_ = Matrix.create(b).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.betapdf(a_, b_);
		});
	}

	/**
	 * p.betainv(a, b) = betainv(p, a, b) ベータ分布の累積分布関数の逆関数
	 * @param {Matrix} a
	 * @param {Matrix} b
	 * @returns {Matrix}
	 */
	betainv(a, b) {
		const a_ = Matrix.create(a).scalar;
		const b_ = Matrix.create(b).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.betainv(a_, b_);
		});
	}

	/**
	 * x.factorial() = factorial(x), x! 階乗関数
	 * @returns {Matrix}
	 */
	factorial() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.factorial();
		});
	}
	
	/**
	 * n.nchoosek(k) = nchoosek(n, k), nCk 二項係数またはすべての組合わせ
	 * @param {Matrix} k
	 * @returns {Matrix}
	 */
	nchoosek(k) {
		const k_ = Matrix.create(k).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.nchoosek(k_);
		});
	}
	
	/**
	 * x.erf() = erf(x) 誤差関数
	 * @returns {Matrix}
	 */
	erf() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.erf();
		});
	}

	/**
	 * x.erfc() = erfc(x) 相補誤差関数
	 * @returns {Matrix}
	 */
	erfc() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.erfc();
		});
	}
	
	/**
	 * x.normpdf(u, s) = normpdf(x, u, s) 正規分布の確率密度関数
	 * @param {number} [u=0.0] - 平均値
	 * @param {number} [s=1.0] - 分散
	 * @returns {Matrix}
	 */
	normpdf(u, s) {
		const u_ = arguments.length <= 0 ? Complex.create(u).scalar : Complex.ZERO;
		const s_ = arguments.length <= 1 ? Complex.create(s).scalar : Complex.ONE;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.normpdf(u_, s_);
		});
	}

	/**
	 * x.normcdf(u, s) = normcdf(x, u, s) 正規分布の累積分布関数
	 * @param {number} [u=0.0] - 平均値
	 * @param {number} [s=1.0] - 分散
	 * @returns {Matrix}
	 */
	normcdf(u, s) {
		const u_ = arguments.length <= 0 ? Complex.create(u).scalar : Complex.ZERO;
		const s_ = arguments.length <= 1 ? Complex.create(s).scalar : Complex.ONE;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.normcdf(u_, s_);
		});
	}

	/**
	 * x.norminv(u, s) = norminv(x, u, s) 正規分布の累積分布関数の逆関数
	 * @param {number} [u=0.0] - 平均値
	 * @param {number} [s=1.0] - 分散
	 * @returns {Matrix}
	 */
	norminv(u, s) {
		const u_ = arguments.length <= 0 ? Complex.create(u).scalar : Complex.ZERO;
		const s_ = arguments.length <= 1 ? Complex.create(s).scalar : Complex.ONE;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.norminv(u_, s_);
		});
	}

	/**
	 * t.tpdf(v) = tpdf(t, v) t分布の確率密度関数
	 * @param {Matrix} v - 自由度
	 * @returns {Matrix}
	 */
	tpdf(v) {
		const v_ = Matrix.create(v).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.tpdf(v_);
		});
	}

	/**
	 * t.tcdf(v) = tcdf(t, v) t分布の累積分布関数
	 * @param {Matrix} v - 自由度
	 * @returns {Matrix}
	 */
	tcdf(v) {
		const v_ = Matrix.create(v).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.tcdf(v_);
		});
	}

	/**
	 * p.tinv(v) = tinv(p, v) t分布の累積分布関数の逆関数
	 * @param {Matrix} v - 自由度
	 * @returns {Matrix}
	 */
	tinv(v) {
		const v_ = Matrix.create(v).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.tinv(v_);
		});
	}

	/**
	 * t.tdist(v, tails) = tdist(t, v, tails) 尾部が指定可能なt分布の累積分布関数
	 * @param {Matrix} v - 自由度
	 * @param {Matrix} tails - 尾部(1...片側、2...両側)
	 * @returns {Matrix}
	 */
	tdist(v, tails) {
		const v_ = Matrix.create(v).scalar;
		const tails_ = Matrix.create(tails).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.tdist(v_, tails_);
		});
	}

	/**
	 * p.tinv2(v) = tinv2(p, v) 両側検定時のt分布の累積分布関数
	 * @param {Matrix} v - 自由度
	 * @returns {Matrix}
	 */
	tinv2(v) {
		const v_ = Matrix.create(v).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.tinv2(v_);
		});
	}

	/**
	 * x.chi2pdf(k) = chi2pdf(x, k) カイ二乗分布の確率密度関数
	 * @param {Matrix} k - 自由度
	 * @returns {Matrix}
	 */
	chi2pdf(k) {
		const k_ = Matrix.create(k).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.chi2pdf(k_);
		});
	}

	/**
	 * x.chi2cdf(k) = chi2cdf(x, k) カイ二乗分布の累積分布関数
	 * @param {Matrix} k - 自由度
	 * @returns {Matrix}
	 */
	chi2cdf(k) {
		const k_ = Matrix.create(k).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.chi2cdf(k_);
		});
	}
	
	/**
	 * p.chi2inv(k) = chi2inv(p, k) カイ二乗分布の累積分布関数の逆関数
	 * @param {Matrix} k - 自由度
	 * @returns {Matrix}
	 */
	chi2inv(k) {
		const k_ = Matrix.create(k).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.chi2inv(k_);
		});
	}

	/**
	 * x.fpdf(d1, d2) = fpdf(x, d1, d2) F分布の確率密度関数
	 * @param {Matrix} d1 - 分子の自由度
	 * @param {Matrix} d2 - 分母の自由度
	 * @returns {Matrix}
	 */
	fpdf(d1, d2) {
		const d1_ = Matrix.create(d1).scalar;
		const d2_ = Matrix.create(d2).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.fpdf(d1_, d2_);
		});
	}

	/**
	 * x.fcdf(d1, d2) = fcdf(x, d1, d2) F分布の累積分布関数
	 * @param {Matrix} d1 - 分子の自由度
	 * @param {Matrix} d2 - 分母の自由度
	 * @returns {Matrix}
	 */
	fcdf(d1, d2) {
		const d1_ = Matrix.create(d1).scalar;
		const d2_ = Matrix.create(d2).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.fcdf(d1_, d2_);
		});
	}

	/**
	 * p.finv(d1, d2) = finv(p, d1, d2) F分布の累積分布関数の逆関数
	 * @param {Matrix} d1 - 分子の自由度
	 * @param {Matrix} d2 - 分母の自由度
	 * @returns {Matrix}
	 */
	finv(d1, d2) {
		const d1_ = Matrix.create(d1).scalar;
		const d2_ = Matrix.create(d2).scalar;
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.finv(d1_, d2_);
		});
	}
	
	/**
	 * A.sum() 合計
	 * @returns {Matrix}
	 */
	sum() {
		const main = function(data) {
			// カハンの加算アルゴリズム
			let sum = Complex.ZERO;
			let delta = Complex.ZERO;
			for(let i = 0; i < data.length; i++) {
				const new_number = data[i].add(delta);
				const new_sum = sum.add(new_number);
				delta = new_sum.sub(sum).sub(new_number);
				sum = new_sum;
			}
			return [sum];
		};
		return this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.mean() 相加平均
	 * @returns {Matrix}
	 */
	mean() {
		const main = function(data) {
			// カハンの加算アルゴリズム
			let sum = Complex.ZERO;
			let delta = Complex.ZERO;
			for(let i = 0; i < data.length; i++) {
				const new_number = data[i].add(delta);
				const new_sum = sum.add(new_number);
				delta = new_sum.sub(sum).sub(new_number);
				sum = new_sum;
			}
			return [sum.div(data.length)];
		};
		return this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.geomean() 相乗平均／幾何平均
	 * @returns {Matrix}
	 */
	geomean() {
		const main = function(data) {
			let x = Complex.ONE;
			for(let i = 0; i < data.length; i++) {
				x = x.mul(data[i]);
			}
			return [x.sqrt()];
		};
		return this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.var() 分散
	 * @param {Matrix} [cor=0] - 補正値 0(不偏分散), 1(標本分散)
	 * @returns {Matrix}
	 */
	var(cor) {
		const M = this.mean();
		let col = 0;
		const correction = arguments.length === 0 ? 0 : Matrix.create(cor).doubleValue;
		const main = function(data) {
			let mean;
			if(M.isScalar()) {
				mean = M.scalar;
			}
			else {
				mean = M.getComplex(col++);
			}
			let x = Complex.ZERO;
			for(let i = 0; i < data.length; i++) {
				const a = data[i].sub(mean);
				x = x.add(a.dot(a));
			}
			if(data.length === 1) {
				return [x.div(data.length)];
			}
			else {
				return [x.div(data.length - 1 + correction)];
			}
		};
		return this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.std() 標準偏差
	 * @param {Matrix} [cor=0] - 補正値 0(不偏), 1(標本)
	 * @returns {Matrix}
	 */
	std(cor) {
		const correction = arguments.length === 0 ? 0 : Matrix.create(cor).doubleValue;
		const M = this.var(correction);
		M._each(function(num) {
			return num.sqrt();
		});
		return M;
	}

	/**
	 * A.cov() 共分散行列
	 * @param {Matrix} [cor=0] - 補正値 0(不偏分散), 1(標本分散)
	 * @returns {Matrix}
	 */
	cov(cor) {
		let correction = arguments.length === 0 ? 0 : Matrix.create(cor).doubleValue;
		if(this.isVector()) {
			return this.var(correction);
		}
		correction = this.row_length === 1 ? 1 : correction;
		const x = this.matrix_array;
		const mean = this.mean().matrix_array[0];
		// 上三角行列、対角行列
		const y = new Array(this.column_length);
		for(let a = 0; a < this.column_length; a++) {
			const a_mean = mean[a];
			y[a] = new Array(this.column_length);
			for(let b = a; b < this.column_length; b++) {
				const b_mean = mean[b];
				let sum = Complex.ZERO;
				for(let row = 0; row < this.row_length; row++) {
					sum = sum.add((x[row][a].sub(a_mean)).dot(x[row][b].sub(b_mean)));
				}
				y[a][b] = sum.div(this.row_length - 1 + correction);
			}
		}
		// 下三角行列を作る
		for(let row = 1; row < y[0].length; row++) {
			for(let col = 0; col < row; col++) {
				y[row][col] = y[col][row];
			}
		}
		return new Matrix(y);
	}

	/**
	 * A.normalize() サンプルを平均値0、標準偏差1にノーマライズ
	 * @returns {Matrix}
	 */
	normalize() {
		const mean_zero = this.sub(this.mean());
		const std_one = mean_zero.ndiv(mean_zero.std());
		return std_one;
	}

	/**
	 * A.corrcoef() 相関行列
	 * @returns {Matrix}
	 */
	corrcoef() {
		return this.normalize().cov();
	}


	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆
	// signal 信号処理用
	// ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆

	/**
	 * 各項に sinc()
	 * @returns {Matrix}
	 */
	sinc() {
		return this.cloneMatrixDoEachCalculation(function(num) {
			return num.sinc();
		});
	}

	/**
	 * A.fft() 離散フーリエ変換
	 * @returns {Matrix}
	 */
	fft(is_2_dimensions = false) {
		const main = function(data) {
			const real = new Array(data.length);
			const imag = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				real[i] = data[i].real;
				imag[i] = data[i].imag;
			}
			const result = Signal.fft(real, imag);
			const y = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				y[i] = new Complex([result.real[i], result.imag[i]]);
			}
			return y;
		};
		return is_2_dimensions ? this.__column_oriented_2_dimensional_processing(main) : this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.ifft() 逆離散フーリエ変換
	 * @returns {Matrix}
	 */
	ifft(is_2_dimensions = false) {
		const main = function(data) {
			const real = new Array(data.length);
			const imag = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				real[i] = data[i].real;
				imag[i] = data[i].imag;
			}
			const result = Signal.ifft(real, imag);
			const y = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				y[i] = new Complex([result.real[i], result.imag[i]]);
			}
			return y;
		};
		return is_2_dimensions ? this.__column_oriented_2_dimensional_processing(main) : this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.powerfft() パワースペクトル密度
	 * @returns {Matrix}
	 */
	powerfft() {
		const main = function(data) {
			const real = new Array(data.length);
			const imag = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				real[i] = data[i].real;
				imag[i] = data[i].imag;
			}
			const result = Signal.powerfft(real, imag);
			const y = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				y[i] = new Complex([result.real[i], result.imag[i]]);
			}
			return y;
		};
		return this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.dct() DCT-II (DCT)
	 * @returns {Matrix}
	 */
	dct(is_2_dimensions = false) {
		if(this.isComplex()) {
			throw "dct don't support complex numbers.";
		}
		const main = function(data) {
			const real = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				real[i] = data[i].real;
			}
			const result = Signal.dct(real);
			const y = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				y[i] = new Complex(result[i]);
			}
			return y;
		};
		return is_2_dimensions ? this.__column_oriented_2_dimensional_processing(main) : this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.idct() DCT-III (IDCT)
	 * @returns {Matrix}
	 */
	idct(is_2_dimensions = false) {
		if(this.isComplex()) {
			throw "idct don't support complex numbers.";
		}
		const main = function(data) {
			const real = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				real[i] = data[i].real;
			}
			const result = Signal.idct(real);
			const y = new Array(data.length);
			for(let i = 0; i < data.length; i++) {
				y[i] = new Complex(result[i]);
			}
			return y;
		};
		return is_2_dimensions ? this.__column_oriented_2_dimensional_processing(main) : this.__column_oriented_1_dimensional_processing(main);
	}

	/**
	 * A.fft2() 2次元の離散フーリエ変換
	 * @returns {Matrix}
	 */
	fft2() {
		return this.fft(true);
	}

	/**
	 * A.ifft2() 2次元の逆離散フーリエ変換
	 * @returns {Matrix}
	 */
	ifft2() {
		return this.ifft(true);
	}

	/**
	 * A.dct2() 2次元のDCT変換
	 * @returns {Matrix}
	 */
	dct2() {
		return this.dct2(true);
	}

	/**
	 * A.idct2() 2次元の逆DCT変換
	 * @returns {Matrix}
	 */
	idct2() {
		return this.idct(true);
	}

	/**
	 * A.conv(B) = conv(A, B) 畳み込み積分、多項式乗算
	 * @param {Matrix} number
	 * @returns {Matrix}
	 */
	conv(number) {
		const M1 = this;
		const M2 = Matrix.create(number);
		if(M1.isMatrix() || M2.isMatrix()) {
			throw "conv don't support matrix numbers.";
		}
		const M1_real = new Array(M1.length);
		const M1_imag = new Array(M1.length);
		const M2_real = new Array(M2.length);
		const M2_imag = new Array(M2.length);
		if(M1.isRow()) {
			for(let i = 0; i < M1.column_length; i++) {
				M1_real[i] = M1.matrix_array[0][i].real;
				M1_imag[i] = M1.matrix_array[0][i].imag;
			}
		}
		else {
			for(let i = 0; i < M1.row_length; i++) {
				M1_real[i] = M1.matrix_array[i][0].real;
				M1_imag[i] = M1.matrix_array[i][0].imag;
			}
		}
		if(M2.isRow()) {
			for(let i = 0; i < M2.column_length; i++) {
				M2_real[i] = M2.matrix_array[0][i].real;
				M2_imag[i] = M2.matrix_array[0][i].imag;
			}
		}
		else {
			for(let i = 0; i < M2.row_length; i++) {
				M2_real[i] = M2.matrix_array[i][0].real;
				M2_imag[i] = M2.matrix_array[i][0].imag;
			}
		}
		const y = Signal.conv(M1_real, M1_imag, M2_real, M2_imag);
		const m = new Array(y.real.length);
		for(let i = 0; i < y.real.length; i++) {
			m[i] = new Complex([y.real[i], y.imag[i]]);
		}
		const M = new Matrix([m]);
		return M2.isRow() ? M : M.transpose();
	}

	/**
	 * A.xcorr(B) = xcorr(A, B) 自己相関関数、相互相関関数
	 * @param {Matrix} [number=this] - 省略した場合は自己相関関数
	 * @returns {Matrix}
	 */
	xcorr(number) {
		if(!number) {
			return this.xcorr(this);
		}
		const M1 = this;
		const M2 = Matrix.create(number);
		if(M1.isMatrix() || M2.isMatrix()) {
			throw "conv don't support matrix numbers.";
		}
		const M1_real = new Array(M1.length);
		const M1_imag = new Array(M1.length);
		const M2_real = new Array(M2.length);
		const M2_imag = new Array(M2.length);
		if(M1.isRow()) {
			for(let i = 0; i < M1.column_length; i++) {
				M1_real[i] = M1.matrix_array[0][i].real;
				M1_imag[i] = M1.matrix_array[0][i].imag;
			}
		}
		else {
			for(let i = 0; i < M1.row_length; i++) {
				M1_real[i] = M1.matrix_array[i][0].real;
				M1_imag[i] = M1.matrix_array[i][0].imag;
			}
		}
		if(M2.isRow()) {
			for(let i = 0; i < M2.column_length; i++) {
				M2_real[i] = M2.matrix_array[0][i].real;
				M2_imag[i] = M2.matrix_array[0][i].imag;
			}
		}
		else {
			for(let i = 0; i < M2.row_length; i++) {
				M2_real[i] = M2.matrix_array[i][0].real;
				M2_imag[i] = M2.matrix_array[i][0].imag;
			}
		}
		const y = Signal.xcorr(M1_real, M1_imag, M2_real, M2_imag);
		const m = new Array(y.real.length);
		for(let i = 0; i < y.real.length; i++) {
			m[i] = new Complex([y.real[i], y.imag[i]]);
		}
		const M = new Matrix([m]);
		return M1.isRow() ? M : M.transpose();
	}

	/**
	 * 窓関数
	 * @param {string} name - 窓関数の名前
	 * @param {Matrix} size - 長さ
	 * @param {boolean} [isPeriodic] - true なら periodic, false なら symmetric
	 * @returns {Matrix} 列ベクトル
	 */
	static window(name, size, isPeriodic) {
		const size_ = Matrix.create(size).intValue;
		const y = Signal.window(name, size_, isPeriodic);
		return (new Matrix(y)).transpose();
	}

	/**
	 * ハニング窓
	 * @param {Matrix} size - 長さ
	 * @param {boolean} [isPeriodic] - true なら periodic, false なら symmetric
	 * @returns {Matrix} 列ベクトル
	 */
	static hann(size, isPeriodic) {
		return Matrix.window("hann", size, isPeriodic);
	}
	
	/**
	 * ハミング窓
	 * @param {Matrix} size - 長さ
	 * @param {boolean} [isPeriodic] - true なら periodic, false なら symmetric
	 * @returns {Matrix} 列ベクトル
	 */
	static hamming(size, isPeriodic) {
		return Matrix.window("hamming", size, isPeriodic);
	}
	

}
