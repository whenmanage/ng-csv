/**
 * Created by asafdav on 15/05/14.
 */
angular.module('ngCsv.services').
service('CSV', ['$q', function($q) {

    var EOL = '\r\n';
    var BOM = "\ufeff";

    var specialChars = {
        '\\t': '\t',
        '\\b': '\b',
        '\\v': '\v',
        '\\f': '\f',
        '\\r': '\r'
    };

    /**
     * Stringify one field
     * @param data
     * @param options
     * @returns {*}
     */
    this.stringifyField = function(data, options) {
        if (options.decimalSep === 'locale' && this.isFloat(data)) {
            return data.toLocaleString();
        }

        if (options.decimalSep !== '.' && this.isFloat(data)) {
            return data.toString().replace('.', options.decimalSep);
        }

        if (typeof data === 'string') {
            data = data.replace(/"/g, '""'); // Escape double qoutes

            if (options.quoteStrings || data.indexOf(',') > -1 || data.indexOf('\n') > -1 || data.indexOf('\r') > -1) {
                data = options.txtDelim + data + options.txtDelim;
            }

            return data;
        }

        if (typeof data === 'boolean') {
            return data ? 'TRUE' : 'FALSE';
        }

        return data;
    };

    /**
     * Helper function to check if input is float
     * @param input
     * @returns {boolean}
     */
    this.isFloat = function(input) {
        return +input === input && (!isFinite(input) || Boolean(input % 1));
    };

    /**
     * Creates a csv from a data array
     * @param data
     * @param options
     *  * header - Provide the first row (optional)
     *  * fieldSep - Field separator, default: ',',
     *  * addByteOrderMarker - Add Byte order mark, default(false)
     * @param callback
     */
    this.stringify = function(data, options) {
        var def = $q.defer();

        var that = this;
        var csv = "";
        var csvContent = "";

        var dataPromise = $q.when(data).then(function(responseData) {

            var arrData = [];

            if (angular.isArray(responseData)) {
                arrData = responseData;
            } else if (angular.isFunction(responseData)) {
                arrData = responseData();
            } else if (angular.isObject(responseData)) {
                arrData = responseData;
            }

            // Check if needs to write multiple csv files
            if (angular.isDefined(options.multiCsv) && options.multiCsv && typeof options.multiCsv === 'boolean') {
                angular.forEach(arrData, function(val, key) {
                    csvContent += that.capitalize(key) + EOL;
                    JsonObjectToCSV(val, true,key);
                    csvContent += EOL;
                });
            } else {
                JsonObjectToCSV(arrData, false,"");
            }

            function addKeysColumnHeader(originData, multiCsv) {
                // Check if using keys as labels
                if (angular.isDefined(options.label) && options.label && typeof options.label === 'boolean') {
                    var labelArray, labelString, iterator;

                    labelArray = [];

                    if (multiCsv) {
                        iterator = !!options.columnOrder ? options.columnOrder : originData[0];
                    } else {
                        iterator = !!options.columnOrder ? options.columnOrder : arrData[0];
                    }

                    angular.forEach(iterator, function(value, label) {
                        var val = !!options.columnOrder ? value : label;
                        this.push(that.stringifyField(val, options));
                    }, labelArray);
                    labelString = labelArray.join(options.fieldSep ? options.fieldSep : ",");
                    csvContent += labelString + EOL;
                }
            }

            function JsonObjectToCSV(originData, multiCsv,dataLabel) {
                addHeader(dataLabel, multiCsv);
                addKeysColumnHeader(originData, multiCsv);
                angular.forEach(originData, function(oldRow, index) {
                    var row = angular.copy(originData[index]);
                    var dataString, infoArray;

                    infoArray = [];

                    var iterator = !!options.columnOrder ? options.columnOrder : row;
                    angular.forEach(iterator, function(field, key) {
                        var val = !!options.columnOrder ? row[field] : field;
                        this.push(that.stringifyField(val, options));
                    }, infoArray);

                    dataString = infoArray.join(options.fieldSep ? options.fieldSep : ",");
                    csvContent += index < originData.length ? dataString + EOL : dataString;
                });
            }

            function addHeader(key, multiCsv) {
                // Check if there's a provided header array
                if (angular.isDefined(options.header) && options.header) {
                    var encodingArray, headerString;

                    encodingArray = [];
                    if (multiCsv) {
                        angular.forEach(options.header[key], function(title, key) {
                            this.push(that.stringifyField(title, options));
                        }, encodingArray);
                    } else {
                        angular.forEach(options.header, function(title, key) {
                            this.push(that.stringifyField(title, options));
                        }, encodingArray);
                    }

                    headerString = encodingArray.join(options.fieldSep ? options.fieldSep : ",");
                    csvContent += headerString + EOL;
                }
            }

            // Add BOM if needed
            if (options.addByteOrderMarker) {
                csv += BOM;
            }

            // Append the content and resolve.
            csv += csvContent;
            def.resolve(csv);
        });

        if (typeof dataPromise['catch'] === 'function') {
            dataPromise['catch'](function(err) {
                def.reject(err);
            });
        }

        return def.promise;
    };

    /**
     * Helper function to check if input is really a special character
     * @param input
     * @returns {boolean}
     */
    this.isSpecialChar = function(input) {
        return specialChars[input] !== undefined;
    };

    /**
     * Helper function to get what the special character was supposed to be
     * since Angular escapes the first backslash
     * @param input
     * @returns {special character string}
     */
    this.getSpecialChar = function(input) {
        return specialChars[input];
    };

    this.capitalize = function(input) {
        return input.charAt(0).toUpperCase() + input.slice(1);
    };

}]);