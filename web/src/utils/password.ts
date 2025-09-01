export const PASSWORD_HINT =
  '8〜64文字、英字と数字をそれぞれ1文字以上含め、空白は不可（記号OK）';

export const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,64}$/;
