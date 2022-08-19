import { ComponentType } from "react";
import { connect } from "formik";

export function formikConnect<C extends ComponentType<{ formik: any }>>(
  component: C
) {
  return connect(component as any) as ComponentType<
    Omit<GetProps<C>, "formik">
  >;
}

type GetProps<T> = T extends ComponentType<infer P> ? P : never;
