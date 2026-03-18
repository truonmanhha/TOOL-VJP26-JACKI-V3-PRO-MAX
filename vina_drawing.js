var Module = {
	FS: {},
	arguments: [],
	preRun: [function () {}],
	postRun: [
		function () {
			Module.FS = FS;
		},
	],
};
