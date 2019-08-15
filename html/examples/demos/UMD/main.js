﻿/* global konpeito, Log */

// @ts-check
/// <reference path="../../../../build/index.d.ts" />

const Matrix = konpeito.Matrix;
const $ = Matrix.create;

/**
 * @param {string} text 
 */
const testLUP = function(text) {
	Log.println("lup");
	const A = $(text);
	Log.println(A);
	const LUP = A.lup();
	Log.println(LUP.L);
	Log.println(LUP.U);
	Log.println(LUP.P);
	Log.println(LUP.P.T().mul(LUP.L).mul(LUP.U));
};

/**
 * @param {string} text 
 */
const testQR = function(text) {
	Log.println("qr");
	const A = $(text);
	Log.println(A);
	const QR = A.qr();
	Log.println(QR.Q);
	Log.println(QR.R);
	Log.println(QR.Q.mul(QR.R));
};

/**
 * @param {string} text 
 */
const testTRI = function(text) {
	Log.println("tridiagonalize");
	const A = $(text);
	Log.println(A);
	const VD = A.tridiagonalize();
	Log.println(VD.P);
	Log.println(VD.H);
	Log.println(VD.P.mul(VD.H).mul(VD.P.T()));
};

/**
 * @param {string} text 
 */
const testEIG = function(text) {
	Log.println("eig");
	const A = $(text);
	Log.println(A);
	const VD = A.eig();
	Log.println(VD.V);
	Log.println(VD.D);
	Log.println(VD.V.mul(VD.D).mul(VD.V.T()));
};

/**
 * @param {string} text 
 */
const testSVD = function(text) {
	Log.println("svd");
	const A = $(text);
	Log.println(A);
	const USV = A.svd();
	Log.println(USV.U);
	Log.println(USV.S);
	Log.println(USV.V);
	Log.println(USV.U.mul(USV.S).mul(USV.V.T()));
};

const main = function() {

	Log.println("◆◆SMath クラスのサンプル");

	// 3.16578 + 1.9596i
	Log.println("sin");
	Log.println($("1 + 2i").sin());

	// 2.03272 - 3.0519i
	Log.println("cos");
	Log.println($("1 + 2i").cos());

	// 0.0338128 + 1.01479i
	Log.println("tan");
	Log.println($("1 + 2i").tan());

	// 1.33897 + 0.402359i
	Log.println("atan");
	Log.println($("1 + 2i").atan());

	// -0.0151327 - 0.179867i
	Log.println("dotpow");
	Log.println($("1 + 2i").dotpow("2 + 3i"));

	Log.println("eye");
	Log.println(Matrix.eye(3));
	Log.println("ones");
	Log.println(Matrix.ones(3));
	Log.println("zeros");
	Log.println(Matrix.zeros(3));
	Log.println("rand");
	Log.println(Matrix.rand(3));
	Log.println("randn");
	Log.println(Matrix.randn(3));

	// 1  2  3
	// 4  5  6
	// 7  8  9
	Log.println($("[1 2 3; 4 5 6; 7 8 9]"));

	{
		Log.println("getMatrix / setMatrix");
		const X = $("[1 2 3 4;5 6 7 8;9 10 11 12;13 14 15 16]");

		//	1   2   3   4
		//	5   6   7   8
		//	9  10  11  12
		// 13  14  15  16
		Log.println(X);

		//  5  6  7  8
		Log.println(X.getMatrix(1, ":"));

		// 13  14  15  16
		//	9  10  11  12
		//	5   6   7   8
		//	1   2   3   4
		Log.println(X.getMatrix("3:-1:0", ":"));

		// 13  14  15  16
		//	9  10  11  12
		//	5   6   7   8
		//	1   2   3   4
		Log.println(X.getMatrix("4:-1:1", ":", true));

		//	1  101    3    4
		//	5  102    7    8
		//	9  103   11   12
		// 13  104   15   16
		Log.println(X.setMatrix(":", "2", "[101;102;103;104]", true));
	}

	// 18 +  7i  21 +  8i
	// 40 +  0i  47 +  0i
	Log.println("mul");
	Log.println($("[1 2 + j; 3 4]").mul($("[4 5; 7 8]")));

	// 3 +  0i   6 +  3i
	// 9 +  0i  12 +  0i
	Log.println("mul");
	Log.println($("[1 2 + j; 3 4]").mul($(3)));

	// -0.5000 -0.7500  0.2500
	//  0.5000  0.2500  0.2500
	// -1.0000 -0.5000  0.5000
	Log.println("inv");
	Log.println($("[1 1 -1; -2 0 1; 0 2 1]").inv());
	
	// -1.3333 -0.3333  0.6667
	// 1.0833  0.3333 -0.4167
	Log.println("pinv");
	Log.println($("[1 2;3 4;5 6]").pinv());
	
	//-1.0000  4.0000
	// 0.0000  2.0000
	Log.println("div");
	Log.println($("[1 2;2 2]").div("[3 2;1 1]"));

	// 0 1 1 2 1 1 2 2 1
	Log.println("rank");
	Log.println($("[0]").rank());
	Log.println($("[3]").rank());
	Log.println($("[0 0 0;0 1 0;0 0 0]").rank());
	Log.println($("[2 3 4;1 4 2;2 1 4]").rank());
	Log.println($("[1 2 1]").rank());
	Log.println($("[1;2;3]").rank());
	Log.println($("[1 2 3 -1;0 -1 -1 1;2 3 5 -1]").rank());
	Log.println($("[1 2 3;0 -1 -1;2 3 5]").rank());
	Log.println($("[0 0 0;0 0 0;0 0 1]").rank());
	
	// 22
	// -45
	// -32
	Log.println("det");
	Log.println($("[6 2;1 4]").det());
	Log.println($("[1 2 3;0 -1 5;-2 3 4]").det());
	Log.println($("[3 2 1 0;1 2 3 4;2 1 0 1;2 0 2 1]").det());

	// 1, -1, 3, -2
	Log.println("linsolve");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").linsolve("[2; 12; 4; -1]"));

	// [2 4]
	Log.println("size");
	Log.println($("[2 1 3 4;3 2 5 2]").size());

	// 3  4  5  4
	Log.println("max");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").max());

	// -1 -3  1 -1
	Log.println("min");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").min());

	// -3
	Log.println("min.min");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").min().min());

	// [1 2 3;4 5 6]
	Log.println($("[1 2 3;:;4 5 6]"));

	// 6
	Log.println("length");
	Log.println($("[1 2 3 4 5 6]").length);
	Log.println($("[1;2;3;4;5;6]").length);

	// 9.508032000695723
	Log.println("norm");
	Log.println($("[1 2 3; 4 5 6]").norm());

	// 5
	Log.println("getComplex");
	Log.println($("[1 2 3; 4 5 6]").getComplex(1, 1));

	// -4 - 7i
	Log.println("inner");
	Log.println($("1 + 2j").inner("2 - 3j"));

	// 21 +  5i  12 + 32i
	// 12 +  5i; 21 + 32i
	Log.println("inner");
	Log.println($("[1 2;3j 4]").inner("[5j 6;7j 8j]"));
	Log.println($("[1 2;3j 4]").inner("[5j 6;7j 8j]", 2));

	// QR分解
	testQR("[1 2 3;4 5 6;7 8 9]");
	testQR("[0 0 0;1 2 3;4 5 6]");
	testQR("[1 2 3;4 5 6;0 0 0]");
	testQR("[1 2; 3 4; 5 6]");
	testQR("[1 2 3;4 5 6]");
	
	// LUP分解
	testLUP("[1 2 3 3;4 5 6 6;7 8 9 2]");
	testLUP("[1 4 2;3 5 1;2 4 2;1 0 9]");
	testLUP("[1 4 2;3 5 1;0 0 0;1 0 9]");
	testLUP("[1 2 3;4 5 6;7 8 9]");
	testLUP("[1 2;3 4;5 6]");

	// 対称行列の三重対角化
	testTRI("[1 1 1 1;1 2 2 2;1 2 3 3;1 2 3 4]");
		
	// 対称行列の固有値分解
	testEIG("[1 1 1 1;1 2 2 2;1 2 3 3;1 2 3 4]");

	// 特異値分解
	testSVD("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]");
	testSVD("[1 2 3;4 5 6;7 8 9]");
	testSVD("[1 2 3;4 5 6]");
	testSVD("[1 2;3 4;5 6]");
	
	//  1.7500  1.0000  2.5000  2.0000
	Log.println("mean");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").mean());

	//  0.0000 + 4.2426i  0.0000 + 4.8990i  3.8730 + 0.0000i  0.0000 + 4.8990i
	Log.println("geomean");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").geomean());

	//-1 -3  1 -1
	// 2  1  1  2
	// 3  2  3  3
	// 3  4  5  4
	Log.println("sort");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").sort());

	// 2.5000  1.5000  2.0000  2.5000
	Log.println("median");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").median());

	//  3 -3  1 -1
	Log.println("mode");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").mode());

	// 4.5000  0.5000  2.0000  8.0000
	Log.println("var");
	Log.println($("[1 2 3 4;4 1 5 0]").var());
	
	// 2.1213  0.7071  1.4142  2.8284
	Log.println("std");
	Log.println($("[1 2 3 4;4 1 5 0]").std());

	//	 4.5000 -1.5000  3.0000 -6.0000
	//	-1.5000  0.5000 -1.0000  2.0000
	//	 3.0000 -1.0000  2.0000 -4.0000
	//	-6.0000  2.0000 -4.0000  8.0000
	Log.println("cov");
	Log.println($("[1 2 3 4;4 1 5 0]").cov());

	// -0.8461 -0.2820  0.2820  0.8461  0.8461 -0.8461  1.4102 -1.4102
	Log.println("normalize");
	Log.println($("[1 2 3 4 4 1 5 0]").normalize());

	//	 1.0000  0.9570  0.5058 -0.4891
	//	 0.9570  1.0000  0.2365 -0.6814
	//	 0.5058  0.2365  1.0000  0.3223
	//	-0.4891 -0.6814  0.3223  1.0000
	Log.println("corrcoef");
	Log.println($("[2 1 3 4;3 2 5 2; 3 4 1 -1; -1 -3 1 3]").corrcoef());

	// gammaln 0.1521
	Log.println("gammaln");
	Log.println($(0.8).gammaln());

	// tcdf 0.7589
	Log.println("tcdf");
	Log.println($(0.8).tcdf(3));

	// tinv 0.9785
	Log.println("tinv");
	Log.println($(0.8).tinv(3));

	Log.println("fft");
	Log.println($("[1+j 2-3j -3 -4]").fft());
	Log.println($("[1+j 2-3j -3 -4]").fft().ifft());

	Log.println("dct");
	Log.println($("[1 2 30 100]").dct());
	Log.println($("[1 2 30 100]").dct().idct());

	Log.println("conv");
	Log.println($("[10 20 30 + j]").conv("[1 + j 2 3]"));

	Log.println("xcorr");
	Log.println($("[10 20 30 + j]").xcorr("[1 + j 2 3]"));

	Log.println("hamming");
	Log.println($(Matrix.hamming(4)));
	
};

main();
