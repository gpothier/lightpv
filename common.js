
Accounts.config({
	forbidClientAccountCreation: false
});

IMAGES_DIR = "/tmp/lightpv/images";

Router.map(function() {
	this.route("files", {
		path: "/files/:path(*)",
		where: "server",
		action: function() {
			var fs = Meteor.npmRequire("fs");
			var path = this.params.path;
			path = path.replace(/[^A-Za-z0-9]/g, "");
			path = IMAGES_DIR + "/" + path + ".jpg";
			
			if (! fs.existsSync(path)) {
				this.response.writeHead(404, {});
				return this.response.end("Not found");
			}

			var file = fs.readFileSync(path);

			var headers = {
				"Content-type": "image/jpeg",
				"Content-Disposition": "inline; filename=" + path
			};

			this.response.writeHead(200, headers);
			return this.response.end(file);
		}
	});
});