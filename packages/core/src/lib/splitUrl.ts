export const splitUrl = (hash: string) => {
  const [pathname, query] = hash.replace(/^#/, "").split("?");

  if (pathname != null) {
    return {
      pathname,
      search: new URLSearchParams(query),
    };
  }
};
