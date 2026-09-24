import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEmail, emailKey, normaliseEmail, suggestEmail } from "../public/js/email.js";

test("accepts ordinary addresses and tidies them", () => {
  for (const ok of ["sam@example.com", "first.last+cecil@sub.example.co.uk", "o'brien@example.ie", "x@xn--bcher-kva.example", "a_b-c@example-mail.org"]) {
    assert.equal(checkEmail(ok).ok, true, ok);
  }
  assert.equal(checkEmail("  Sam.Smith@Example.COM ").email, "Sam.Smith@example.com");
  assert.equal(normaliseEmail(" a b@x.com "), "ab@x.com");
  assert.equal(emailKey("Sam@Example.com"), "sam@example.com");
});

test("rejects the mistakes people actually make, with a reason", () => {
  const cases = {
    "": "empty",
    "sam.example.com": "no_at",
    "sam@@example.com": "many_at",
    "@example.com": "no_local",
    "sam@": "no_domain",
    "sam@example": "no_tld",
    "sam@example.c": "bad_tld",
    "sam@example..com": "bad_dots",
    ".sam@example.com": "bad_dots",
    "sam..smith@example.com": "bad_dots",
    "sam@-example.com": "bad_domain",
    "sam@exa_mple.com": "bad_domain",
    "sam(at)home@example.com": "bad_local",
    "sam@example.123": "bad_tld",
  };
  for (const [input, reason] of Object.entries(cases)) {
    const result = checkEmail(input);
    assert.equal(result.ok, false, input);
    assert.equal(result.reason, reason, input);
    assert.ok(result.message.length > 5);
  }
  assert.equal(checkEmail(`${"a".repeat(65)}@example.com`).reason, "local_too_long");
  assert.equal(checkEmail(`a@${"b".repeat(250)}.com`).reason, "too_long");
});

test("suggests fixes for misspelt common domains", () => {
  assert.equal(suggestEmail("sam@gmial.com"), "sam@gmail.com");
  assert.equal(suggestEmail("Sam@HOTMAIL.CON"), "Sam@hotmail.com");
  assert.equal(suggestEmail("sam@gmail.com"), null);
  assert.equal(suggestEmail("not-an-email"), null);
});
