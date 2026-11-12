export const splitUrl = (url: string) => {
  const [pathname, query] = url.replace(/^#/, "").split("?");

  if (pathname != null) {
    return {
      pathname,
      search: new URLSearchParams(query),
    };
  }
};
