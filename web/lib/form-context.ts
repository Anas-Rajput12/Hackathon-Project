import { createContext } from "react";

export const FormFieldContext = createContext<{ name: string }>({ name: "" });
export const FormItemContext = createContext<{ id: string }>({ id: "" });
