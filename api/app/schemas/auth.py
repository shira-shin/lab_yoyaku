from pydantic import BaseModel, constr, validator
import re

_password_re = re.compile(r'^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,64}$')


class RegisterIn(BaseModel):
    name: constr(strip_whitespace=True, min_length=1, max_length=32)
    email: constr(strip_whitespace=True)
    password: str

    @validator('password')
    def validate_password(cls, v: str) -> str:
        if not _password_re.match(v):
            raise ValueError('パスワードは8〜64文字で英字と数字を各1文字以上含み、空白は不可です。')
        return v
