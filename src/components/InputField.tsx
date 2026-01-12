import type { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";
import type { InputHTMLAttributes } from "react";

type InputFieldProps<TFieldValues extends FieldValues> = {
  label: string;
  type?: string;
  register: UseFormRegister<TFieldValues>;
  name: Path<TFieldValues>;
  defaultValue?: string;
  error?: FieldError | undefined;
  hidden?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};

const InputField = <TFieldValues extends FieldValues>({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
}: InputFieldProps<TFieldValues>) => {
  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        {...register(name)}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p className="text-xs text-red-400">{error.message.toString()}</p>
      )}
    </div>
  );
};

export default InputField;
