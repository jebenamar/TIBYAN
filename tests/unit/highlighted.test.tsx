import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Highlighted } from "@/components/search/highlighted";

describe("<Highlighted>", () => {
  it("wraps ranges in <mark> and renders text, never HTML", () => {
    const text = "<b>أ</b> الصبر";
    const { container } = render(<Highlighted text={text} ranges={[[text.indexOf("الصبر"), text.length]]} />);
    expect(container.querySelector("mark")?.textContent).toBe("الصبر");
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toBe(text);
  });
});
