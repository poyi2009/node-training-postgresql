function isUndefined (value) {
    return value === undefined
}
function isNotValidSting (value) {
    return typeof value !== 'string' || value.trim().length === 0 || value === ''
}
function isNotValidInteger (value) {
    return typeof value !== 'number' || value < 0 || value % 1 !== 0
}
function validPassword(value){
	const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/ //正規表達式：密碼規則包含英文大小寫&數字&長度8~16
	return passwordPattern.test(value);
}

module.exports = {
    isUndefined,
    isNotValidSting,
    isNotValidInteger,
    validPassword
}