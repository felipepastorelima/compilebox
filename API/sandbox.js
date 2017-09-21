const config = {
    timeout: 60,
}

var DockerSandbox = function (timeout_value, path, folder, vm_name, compiler_name, file_name, code, output_command, languageName, e_arguments, stdin_data) {

    this.timeout_value = timeout_value;
    this.path = path;
    this.folder = folder;
    this.vm_name = vm_name;
    this.compiler_name = compiler_name;
    this.file_name = file_name;
    this.code = code;
    this.output_command = output_command;
    this.langName = languageName;
    this.extra_arguments = e_arguments;
    this.stdin_data = stdin_data;
}

DockerSandbox.prototype.run = function (success) {
    var sandbox = this;

    this.prepare(function () {
        sandbox.execute(success);
    });
}

DockerSandbox.prototype.prepare = function (success) {
    var exec = require('child_process').exec;
    var fs = require('fs');
    var sandbox = this;

    exec("mkdir " + this.path + this.folder + " && cp " + this.path + "/Payload/* " + this.path + this.folder + "&& chmod 777 " + this.path + this.folder, function (st) {
        fs.writeFile(sandbox.path + sandbox.folder + "/" + sandbox.file_name, sandbox.code, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log(sandbox.langName + " file was saved!");
                exec("chmod 777 \'" + sandbox.path + sandbox.folder + "/" + sandbox.file_name + "\'")

                fs.writeFile(sandbox.path + sandbox.folder + "/inputFile", sandbox.stdin_data, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Input file was saved!");
                        success();
                    }
                });


            }
        });




    });

}

DockerSandbox.prototype.execute = function (success) {
    var exec = require('child_process').exec;
    var fs = require('fs');
    var myC = 0;
    var sandbox = this;
    var st = this.path + 'timeout.sh ' + this.timeout_value + 's -u mysql -e \'NODE_PATH=/usr/local/lib/node_modules\' -i -t -v  "' + this.path + this.folder + '":/usercode ' + this.vm_name + ' /usercode/script.sh ' + this.compiler_name + ' ' + this.file_name + ' ' + this.output_command + ' ' + this.extra_arguments;
    console.log(st);
    exec(st);
    console.log("------------------------------")
    var intid = setInterval(function () {
        myC = myC + 1;

        fs.readFile(sandbox.path + sandbox.folder + '/completed', 'utf8', function (err, data) {

            //if file is not available yet and the file interval is not yet up carry on
            if (err && myC < sandbox.timeout_value) {
                //console.log(err);
                return;
            }
            //if file is found simply display a message and proceed
            else if (myC < sandbox.timeout_value) {
                console.log("DONE")
                //check for possible errors
                fs.readFile(sandbox.path + sandbox.folder + '/errors', 'utf8', function (err2, data2) {
                    if (!data2) data2 = ""
                    console.log("Error file: ")
                    console.log(data2)

                    console.log("Main File")
                    console.log(data)

                    var lines = data.toString().split('*-COMPILEBOX::ENDOFOUTPUT-*')
                    data = lines[0]
                    var time = lines[1]

                    console.log("Time: ")
                    console.log(time)


                    success(data, time, data2)
                });

                //return the data to the calling functoin

            }
            //if time is up. Save an error message to the data variable
            else {
                //Since the time is up, we take the partial output and return it.
                fs.readFile(sandbox.path + sandbox.folder + '/logfile.txt', 'utf8', function (err, data) {
                    if (!data) data = "";
                    data += "\nExecution Timed Out";
                    console.log("Timed Out: " + sandbox.folder + " " + sandbox.langName)
                    fs.readFile(sandbox.path + sandbox.folder + '/errors', 'utf8', function (err2, data2) {
                        if (!data2) data2 = ""

                        var lines = data.toString().split('*---*')
                        data = lines[0]
                        var time = lines[1]

                        console.log("Time: ")
                        console.log(time)

                        success(data, data2)
                    });
                });

            }


            //now remove the temporary directory
            console.log("ATTEMPTING TO REMOVE: " + sandbox.folder);
            console.log("------------------------------")
            exec("rm -r " + sandbox.folder);


            clearInterval(intid);
        });
    }, 1000);

}


module.exports = DockerSandbox;
