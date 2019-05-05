﻿/**
 * The script is part of SenkoJS.
 * 
 * AUTHOR:
 *  natade (http://twitter.com/natadea)
 * 
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

/**
 * 実数専用の統計処理用の関数集
 */
export default class Statistics {

	/**
	 * gammaln(x) 対数ガンマ関数 
	 * @param {number} x
	 * @returns {number}
	 */
	static gammaln(x) {
		// 参考：奥村,"C言語による最新アルゴリズム事典",p30,技術評論社,1991
		const LOG_2PI = Math.log(2.0 * Math.PI);
		//ベルヌーイ数
		//http://fr.wikipedia.org/wiki/Nombre_de_Bernoulli
		const K2 = ( 1.0 / 6.0)					/ (2 * 1);
		const K4 = (-1.0 / 30.0)				/ (4 * 3);
		const K6 = ( 1.0 / 42.0)				/ (6 * 5);
		const K8 = (-1.0 / 30.0)				/ (8 * 7);
		const K10 = ( 5.0 / 66.0)				/ (10 * 9);
		const K12 = (-691.0 / 2730.0)			/ (12 * 11);
		const K14 = ( 7.0 / 6.0)				/ (14 * 13);
		const K16 = (-3617.0 / 510.0)			/ (16 * 15);
		const K18 = (43867.0 / 798.0)			/ (18 * 17);
		const K20 = (-174611.0 / 330.0)			/ (20 * 19);
		const K22 = (854513.0 / 138.0)			/ (22 * 21);
		const K24 = (-236364091.0 / 2730.0)		/ (24 * 23);
		const K26 = (8553103.0 / 6.0)			/ (26 * 25);
		const K28 = (-23749461029.0 / 870.0)	/ (28 * 27);
		const K30 = (8615841276005.0 / 14322.0)	/ (30 * 29);
		const K32 = (-7709321041217.0 / 510.0)	/ (32 * 31);
		const LIST = [
			K32, K30, K28, K26, K24, K22, K20, K18,
			K16, K14, K12, K10, K8, K6, K4, K2
		];
		let v = 1;
		while(x < LIST.length) {
			v *= x;
			x++;
		}
		const w = 1 / (x * x);
		let y = LIST[0];
		for(let i = 1; i < LIST.length; i++) {
			y *= w;
			y += LIST[i];
		}
		y /= x;
		y += 0.5 * LOG_2PI;
		y += - Math.log(v) - x + (x - 0.5) * Math.log(x);
		return(y);
	}

	/**
	 * q_gamma(x, a, gammaln_a) 不完全ガンマ関数 上側
	 * @param {number} x
	 * @param {number} a
	 * @param {number} gammaln_a
	 * @returns {number}
	 */
	static q_gamma(x, a, gammaln_a) {
		let k;
		let result, w, temp, previous;
		// Laguerreの多項式
		let la = 1.0, lb = 1.0 + x - a;
		if(x < 1.0 + a) {
			return (1 - Statistics.p_gamma(x, a, gammaln_a));
		}
		w = Math.exp(a * Math.log(x) - x - gammaln_a);
		result = w / lb;
		for(k = 2; k < 1000; k++) {
			temp = ((k - 1.0 - a) * (lb - la) + (k + x) * lb) / k;
			la = lb;
			lb = temp;
			w *= (k - 1.0 - a) / k;
			temp = w / (la * lb);
			previous = result;
			result += temp;
			if(result == previous) {
				return(result);
			}
		}
		return Number.NaN;
	}

	/**
	 * p_gamma(x, a, gammaln_a) 不完全ガンマ関数 下側
	 * @param {number} x
	 * @param {number} a
	 * @param {number} gammaln_a
	 * @returns {number}
	 */
	static p_gamma(x, a, gammaln_a) {
		// 参考：奥村,"C言語による最新アルゴリズム事典",p227,技術評論社,1991
		let k;
		let result, term, previous;
		if(x >= 1.0 + a) {
			return (1.0 - Statistics.q_gamma(x, a, gammaln_a));
		}
		if(x === 0.0) {
			return 0.0;
		}
		result = term = Math.exp(a * Math.log(x) - x - gammaln_a) / a;
		for(k = 1; k < 1000; k++) {
			term *= x / (a + k);
			previous = result;
			result += term;
			if(result == previous) {
				return result;
			}
		}
		return Number.NaN;
	}

	/**
	 * gamma(z) ガンマ関数
	 * @param {number} z
	 * @returns {number}
	 */
	static gamma(z) {
		// 参考：奥村,"C言語による最新アルゴリズム事典",p30,技術評論社,1991
		if(z < 0) {
			return (Math.PI / (Math.sin(Math.PI * z) * Math.exp(Statistics.gammaln(1.0 - z))));
		}
		return Math.exp(Statistics.gammaln(z));
	}

	/**
	 * gammainc(x, a, tail) 不完全ガンマ関数
	 * @param {number} x
	 * @param {number} a
	 * @param {string} [tail="lower"] lower(デフォルト)/upper
	 * @returns {number}
	 */
	static gammainc(x, a, tail) {
		if(tail === "lower") {
			return Statistics.p_gamma(x, a, Statistics.gammaln(a));
		}
		else if(tail === "upper") {
			return Statistics.q_gamma(x, a, Statistics.gammaln(a));
		}
		else if(arguments.length === 2) {
			// 引数を省略した場合
			return Statistics.gammainc(x, a, "lower");
		}
		else {
			throw "gammainc unsupported argument [" + tail + "]";
		}
	}
	
	/**
	 * gampdf(x, k, s) ガンマ分布の確率密度関数
	 * @param {number} x
	 * @param {number} k - 形状母数
	 * @param {number} s - 尺度母数
	 * @returns {number}
	 */
	static gampdf(x, k, s) {
		let y = 1.0 / (Statistics.gamma(k) * Math.pow(s, k));
		y *= Math.pow( x, k - 1);
		y *= Math.exp( - x / s );
		return y;
	}

	/**
	 * gamcdf(x, k, s) ガンマ分布の累積分布関数
	 * @param {number} x
	 * @param {number} k - 形状母数
	 * @param {number} s - 尺度母数
	 * @returns {number}
	 */
	static gamcdf(x, k, s) {
		return Statistics.gammainc(x / s, k);
	}
	
	/**
	 * gaminv(p, k, s) ガンマ分布の累積分布関数の逆関数
	 * @param {number} p
	 * @param {number} k - 形状母数
	 * @param {number} s - 尺度母数
	 * @returns {number}
	 */
	static gaminv(p, k, s) {
		if((p < 0.0) || (p > 1.0)) {
			return Number.NaN;
		}
		else if(p == 0.0) {
			return 0.0;
		}
		else if(p == 1.0) {
			return Number.POSITIVE_INFINITY;
		}
		const eps = 1.0e-12;
		// 初期値を決める
		let y = k * s;
		// 単調増加関数なのでニュートン・ラフソン法で解く
		// x_n+1 = x_n - f(x) / f'(x)
		// ここで f(x) は累積分布関数、f'(x) は確率密度関数
		// a = 累積分関数 → f(x)  = 累積分関数 - a と置く。
		// aの微分は0なので無関係
		let delta, y2;
		for(let i = 0; i < 100; i++) {
			y2 = y - ((Statistics.gamcdf(y, k, s) - p) / Statistics.gampdf(y, k, s));
			delta = y2 - y;
			if(Math.abs(delta) <= eps) {
				break;
			}
			y = y2;
		}
		return y;
	}

	/**
	 * beta(x, y) ベータ関数
	 * @param {number} x
	 * @param {number} y
	 * @returns {number}
	 */
	static beta(x, y) {
		// 参考：奥村,"C言語による最新アルゴリズム事典",p30,技術評論社,1991
		return (Math.exp(Statistics.gammaln(x) + Statistics.gammaln(y) - Statistics.gammaln(x + y)));
	}
	
	/**
	 * p_beta(x, a, b) 不完全ベータ関数 下側
	 * @param {number} x
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	static p_beta(x, a, b) {
		// 参考：奥村,"C言語による最新アルゴリズム事典",p231,技術評論社,1991
		let k;
		let result, term, previous;
		if(a <= 0.0) {
			return Number.POSITIVE_INFINITY;
		}
		if(b <= 0.0) {
			if(x < 1.0) {
				return 0.0;
			}
			else if(x === 1.0) {
				return 1.0;
			}
			else {
				return Number.POSITIVE_INFINITY;
			}
		}
		if(x > (a + 1.0) / (a + b + 2.0)) {
			return (1.0 - Statistics.p_beta(1.0 - x, b, a));
		}
		if(x <= 0.0) {
			return 0.0;
		}
		term = a * Math.log(x);
		term += b * Math.log(1.0 - x);
		term += Statistics.gammaln(a + b);
		term -= Statistics.gammaln(a) + Statistics.gammaln(b);
		term = Math.exp(term);
		term /= a;
		result = term;
		for(k = 1; k < 1000; k++) {
			term *= a + b + k - 1.0;
			term *= x;
			term /= a + k;
			previous = result;
			result += term;
			if(result === previous) {
				return result;
			}
		}
		return Number.NaN;
	}

	/**
	 * q_beta(x, a, b) 不完全ベータ関数 上側
	 * @param {number} x
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	static q_beta(x, a, b) {
		return (1.0 - Statistics.p_beta(x, a, b));
	}

	/**
	 * betainc(x, a, b, tail) 不完全ベータ関数
	 * @param {number} x
	 * @param {number} a
	 * @param {number} b
	 * @param {string} [tail="lower"] {string} lower(デフォルト)/upper
	 * @returns {number}
	 */
	static betainc(x, a, b, tail) {
		if(tail === "lower") {
			return Statistics.p_beta(x, a, b);
		}
		else if(tail === "upper") {
			return Statistics.q_beta(x, a, b);
		}
		else if(arguments.length === 3) {
			// 引数を省略した場合
			return Statistics.betainc(x, a, b, "lower");
		}
		else {
			throw "betainc unsupported argument [" + tail + "]";
		}
	}
	
	/**
	 * betapdf(x, a, b) ベータ分布の確率密度関数
	 * @param {number} x
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	static betapdf(x, a, b) {
		//	return(Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x)) / Statistics.beta(a,  b));
		return (Math.pow(x, a - 1) * Math.pow(1 - x, b - 1) / Statistics.beta(a,  b));
	}

	/**
	 * betacdf(x, a, b) ベータ分布の累積分布関数
	 * @param {number} x
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	static betacdf(x, a, b) {
		return Statistics.betainc(x, a, b);
	}
	
	/**
	 * betainv(p, a, b) ベータ分布の累積分布関数の逆関数
	 * @param {number} p
	 * @param {number} a
	 * @param {number} b
	 * @returns {number}
	 */
	static betainv(p, a, b) {
		if((p < 0.0) || (p > 1.0)) {
			return Number.NaN;
		}
		else if((p == 1.0) && (a > 0.0) && (b > 0.0)) {
			return 1.0;
		}
		const eps = 1.0e-14;
		// 初期値を決める
		let y;
		if(b == 0) {
			y = 1.0 - eps;
		}
		else if(a == 0) {
			y = eps;
		}
		else {
			y = a / (a + b);
		}
		// 単調増加関数なのでニュートン・ラフソン法で解く
		// x_n+1 = x_n - f(x) / f'(x)
		// ここで f(x) は累積分布関数、f'(x) は確率密度関数
		// a = 累積分関数 → f(x)  = 累積分関数 - a と置く。
		// aの微分は0なので無関係
		let delta, y2;
		for(let i = 0; i < 100; i++) {
			y2 = y - ((Statistics.betacdf(y, a, b) - p) / Statistics.betapdf(y, a, b));
			delta = y2 - y;
			if(Math.abs(delta) <= eps) {
				break;
			}
			y = y2;
		}
		return y;
	}

	/**
	 * factorial(n) = n! 階乗関数
	 * @param {number} n
	 * @returns {number}
	 */
	static factorial(n) {
		const y = Statistics.gamma(n + 1.0);
		if((n | 0) === n) {
			return Math.round(y);
		}
		else {
			return y;
		}
	}

	/**
	 * nchoosek(n, k) = nCk 二項係数またはすべての組合わせ
	 * @param {number} n
	 * @param {number} k
	 * @returns {number} nCk
	 */
	static nchoosek(n, k) {
		return (Math.round(Statistics.factorial(n) / (Statistics.factorial(n - k) * Statistics.factorial(k))));
	}

	/**
	 * erf(x) 誤差関数
	 * @param {number} x
	 * @returns {number}
	 */
	static erf(x) {
		return (Statistics.p_gamma(x * x, 0.5, Math.log(Math.PI) * 0.5) * (x >= 0 ? 1.0 : -1.0));
	}

	/**
	 * erfc(x) 相補誤差関数
	 * @param {number} x
	 * @returns {number}
	 */
	static erfc(x) {
		return 1.0 - Statistics.erf(x);
	}

	/**
	 * normpdf(x, u, s) 正規分布の確率密度関数
	 * @param {number} x
	 * @param {number} [u=0.0] - 平均値
	 * @param {number} [s=1.0] - 分散
	 * @returns {number}
	 */
	static normpdf(x, u, s) {
		const u_ = typeof u === "number" ? u : 0.0;
		const s_ = typeof s === "number" ? s : 1.0;
		let y = 1.0 / Math.sqrt( 2.0 * Math.PI * s_ * s_ );
		y *= Math.exp( - (x - u_) * (x - u_) / (2.0 * s_ * s_));
		return y;
	}

	/**
	 * normcdf(x, u, s) 正規分布の累積分布関数
	 * @param {number} x
	 * @param {number} [u=0.0] - 平均値
	 * @param {number} [s=1.0] - 分散
	 * @returns {number}
	 */
	static normcdf(x, u, s) {
		const u_ = typeof u === "number" ? u : 0.0;
		const s_ = typeof s === "number" ? s : 1.0;
		return (1.0 + Statistics.erf( (x - u_) / (s_ * Math.sqrt(2.0)) )) / 2.0;
	}

	/**
	 * norminv(p, u, s) 正規分布の累積分布関数の逆関数
	 * @param {number} p - 確率
	 * @param {number} [u=0.0] - 平均値
	 * @param {number} [s=1.0] - 分散
	 * @returns {number}
	 */
	static norminv(p, u, s) {
		if((p < 0.0) || (p > 1.0)) {
			return Number.NaN;
		}
		else if(p == 0.0) {
			return Number.NEGATIVE_INFINITY;
		}
		else if(p == 1.0) {
			return Number.POSITIVE_INFINITY;
		}
		const u_ = typeof u === "number" ? u : 0.0;
		const s_ = typeof s === "number" ? s : 1.0;
		const eps = 1.0e-12;
		// 初期値を決める
		let y = u_;
		// 単調増加関数なのでニュートン・ラフソン法で解く
		// x_n+1 = x_n - f(x) / f'(x)
		// ここで f(x) は累積分布関数、f'(x) は確率密度関数
		// a = 累積分関数 → f(x)  = 累積分関数 - a と置く。
		// aの微分は0なので無関係
		let delta, y2;
		for(let i = 0; i < 200; i++) {
			y2 = y - ((Statistics.normcdf(y, u_, s_) - p) / Statistics.normpdf(y, u_, s_));
			delta = y2 - y;
			if(Math.abs(delta) <= eps) {
				break;
			}
			y = y2;
		}
		return y;
	}

	/**
	 * tpdf(t, k) t分布の確率密度関数
	 * @param {number} t - t値
	 * @param {number} v - 自由度
	 * @returns {number}
	 */
	static tpdf(t, v) {
		let y = 1.0 / (Math.sqrt(v) * Statistics.beta(0.5, v * 0.5));
		y *= Math.pow( 1 + t * t / v, - (v + 1) * 0.5);
		return y;
	}

	/**
	 * tcdf(t) t分布の累積分布関数
	 * @param {number} t - t値
	 * @param {number} v - 自由度
	 * @returns {number}
	 */
	static tcdf(t, v) {
		const y = (t * t) / (v + t * t) ;
		const p = Statistics.betainc( y, 0.5, v * 0.5 ) * (t < 0 ? -1 : 1);
		return 0.5 * (1 + p);
	}

	/**
	 * tinv(p, v) t分布の累積分布関数の逆関数
	 * @param {number} p - 確率
	 * @param {number} v - 自由度
	 * @returns {number}
	 */
	static tinv(p, v) {
		if((p < 0) || (p > 1)) {
			return Number.NaN;
		}
		if(p == 0) {
			return Number.NEGATIVE_INFINITY;
		}
		else if(p == 1) {
			return Number.POSITIVE_INFINITY;
		}
		else if(p < 0.5) {
			const y = Statistics.betainv(2.0 * p, 0.5 * v, 0.5);
			return - Math.sqrt(v / y - v);
		}
		else {
			const y = Statistics.betainv(2.0 * (1.0 - p), 0.5 * v, 0.5);
			return Math.sqrt(v / y - v);
		}
	}

	/**
	 * tdist(t, v, tails) 尾部が指定可能なt分布の累積分布関数
	 * @param {number} t - t値
	 * @param {number} v - 自由度
	 * @param {number} tails - 尾部(1...片側、2...両側)
	 * @returns {number}
	 */
	static tdist(t, v, tails) {
		return (1.0 - Statistics.tcdf(t, v)) * tails;
	}

	/**
	 * einv2(p, v) 両側検定時のt分布の累積分布関数
	 * @param {number} p - 確率
	 * @param {number} v - 自由度
	 * @returns {number}
	 */
	static tinv2(p, v) {
		return - Statistics.tinv( p * 0.5, v);
	}

	/**
	 * chi2pdf(x, v) カイ二乗分布の確率密度関数
	 * @param {number} x 
	 * @param {number} k - 自由度
	 * @returns {number}
	 */
	static chi2pdf(x, k) {
		if(x <= 0.0) {
			return 0;
		}
		let y = Math.pow(x, k / 2.0 - 1.0) * Math.exp( - x / 2.0 );
		y /= Math.pow(2, k / 2.0) * Statistics.gamma( k / 2.0);
		return y;
	}

	/**
	 * chi2cdf(x, v) カイ二乗分布の累積分布関数
	 * @param {number} x 
	 * @param {number} k - 自由度
	 * @returns {number}
	 */
	static chi2cdf(x, k) {
		return Statistics.gammainc(x / 2.0, k / 2.0);
	}

	/**
	 * chi2inv(p, v) カイ二乗分布の逆累積分布関数
	 * @param {number} p - 確率
	 * @param {number} k - 自由度
	 * @returns {number}
	 */
	static chi2inv(p, k) {
		return Statistics.gaminv(p, k / 2.0, 2);
	}

	/**
	 * fpdf(x, d1, d2) F分布の確率密度関数
	 * @param {number} x
	 * @param {number} d1 - 分子の自由度
	 * @param {number} d2 - 分母の自由度
	 * @returns {number}
	 */
	static fpdf(x, d1, d2) {
		let y = 1.0;
		y *= Math.pow( (d1 * x) / (d1 * x + d2) , d1 / 2.0);
		y *= Math.pow( 1.0 - ((d1 * x) / (d1 * x + d2)), d2 / 2.0);
		y /= x * Statistics.beta(d1 / 2.0, d2 / 2.0);
		return y;
	}

	/**
	 * fcdf(x, d1, d2) F分布の累積分布関数
	 * @param {number} x
	 * @param {number} d1 - 分子の自由度
	 * @param {number} d2 - 分母の自由度
	 * @returns {number}
	 */
	static fcdf(x, d1, d2) {
		return Statistics.betacdf( d1 * x / (d1 * x + d2), d1 / 2.0, d2 / 2.0 );
	}

	/**
	 * finv(p, d1, d2) F分布の累積分布関数の逆関数
	 * @param {number} p - 確率
	 * @param {number} d1 - 分子の自由度
	 * @param {number} d2 - 分母の自由度
	 * @returns {number}
	 */
	static finv(p, d1, d2) {
		return (1.0 / Statistics.betainv( 1.0 - p, d2 / 2.0, d1 / 2.0 ) - 1.0) * d2 / d1;
	}

}

/*
//test

// -0.12078223763524543
console.log(Statistics.gammaln(1.5));
// 0.8862269254527578
console.log(Statistics.gamma(1.5));
// 0.034141584125708564
console.log(Statistics.gammainc(0.7, 3));
// 0.02265533286799037
console.log(Statistics.gampdf(10, 7, 3));
// 0.054134113294645195
console.log(Statistics.gamcdf(10, 7, 3));
// 24.333147920078357
console.log(Statistics.gaminv(0.7, 7, 3));

// 1.570796326794883
console.log(Statistics.beta(0.5, 1.5));
// 0.9824904585216
console.log(Statistics.betainc(0.6, 5, 10));
// 0.3400783626239994
console.log(Statistics.betapdf(0.6, 5, 10));
// 0.9824904585216
console.log(Statistics.betacdf(0.6, 5, 10));
// 0.3573724870841673
console.log(Statistics.betainv(0.6, 5, 10));

// 0.3286267594591274
console.log(Statistics.erf(0.3));

//0.2896915527614828
console.log(Statistics.normpdf(0.8));
// 0.7881446014166031
console.log(Statistics.normcdf(0.8));
// 0.8416212335729142
console.log(Statistics.norminv(0.8));
// 0.2713125051165461
console.log(Statistics.tpdf(0.8, 7));
// 0.7749986502650896
console.log(Statistics.tcdf(0.8, 7));
// 0.8960296443137515
console.log(Statistics.tinv(0.8, 7));
// 0.05534766632274616
console.log(Statistics.chi2pdf(2, 7));
// 0.04015963126989858
console.log(Statistics.chi2cdf(2, 7));
// 8.383430828608336
console.log(Statistics.chi2inv(0.7, 7));
// 0.17142030504271438
console.log(Statistics.fpdf(0.7, 0.6, 0.8));
// 0.5005807484277708
console.log(Statistics.fcdf(0.7, 0.6, 0.8));
// 3.8856206694367055
console.log(Statistics.finv(0.7, 0.6, 0.8));
*/
