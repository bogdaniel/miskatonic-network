exports.randomIntInclusive = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.randomCards = function (limit, amount) {
    var arr = [];

    while (arr.length < limit) {
        var randomnumber = this.randomIntInclusive(1, amount) - 1;
        var found = false;

        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == randomnumber) {
                found = true;
                break;
            }
        }

        if (!found) {
            arr[arr.length] = randomnumber;
        }
    }

    return arr;
};
