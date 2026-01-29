export interface SwaggerUI {
  authActions: {
    authorize: (value: {
      bearer: {
        value: string;
      };
    }) => void;
  };
}
