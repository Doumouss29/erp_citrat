// Fonctions JavaScript récentes utilisées par l'application ou ses bibliothèques (lecteur PDF, etc.),
// absentes des navigateurs plus anciens. Doit rester le premier import de main.jsx.
import "core-js/actual/array/at";
import "core-js/actual/array/find-last";
import "core-js/actual/array/find-last-index";
import "core-js/actual/string/at";
import "core-js/actual/string/replace-all";
import "core-js/actual/typed-array/at";
import "core-js/actual/object/has-own";
import "core-js/actual/promise/with-resolvers";
import "core-js/actual/structured-clone";

if (typeof crypto !== "undefined" && !crypto.randomUUID && crypto.getRandomValues) {
  crypto.randomUUID = () =>
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16));
}
