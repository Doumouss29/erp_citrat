// Board-specific page URL helper — prefixes all board routes with /board
export function createBoardPageUrl(pageName) {
  return "/board/" + pageName.replace(/ /g, "-");
}