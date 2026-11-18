"""Clips for /learnings/vision-language-models."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class TokenCount(Clip):
    """How many visual tokens a picture becomes: rows of squares times
    columns of squares. LLaVA-1.5 squeezes every picture to 336 pixels a side,
    so the answer is always 576; Qwen2-VL keeps the picture's own size and
    counts 28-pixel squares, so a photo gets 1125 and a line of text 8."""

    def construct(self):
        said, sp = split_words(
            "tokens", "=", "squares down", R"$\times$", "squares across",
            font_size=40,
        )
        rule, rp = split_formula(
            "N", "=", R"\frac{H}{p}", R"\times", R"\frac{W}{p}",
            font_size=64,
            t2c={"N": SAGE},
        )
        said.to_edge(UP, buff=0.9)
        rule.next_to(said, DOWN, buff=0.6)
        key = words(R"$H$, $W$: the picture's height and width in pixels; $p$: the side of one square", font_size=34, color=FADED)
        key.next_to(rule, DOWN, buff=0.45)

        self.play(Write(said), run_time=1.6)
        self.wait(0.4)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(5)), lag_ratio=0.15),
            run_time=2,
        )
        self.play(FadeIn(key, shift=0.15 * UP))
        self.wait(0.8)
        self.play(FadeOut(said), FadeOut(key), rule.animate.to_edge(UP, buff=0.6), run_time=1)

        # Three pictures, one row each: a label, then the numbers dropped in
        def row(label: str, tex: tuple[str, ...], y: float, color=INK):
            name = words(label, font_size=34, color=FADED)
            sums, parts = split_formula(*tex, font_size=50)
            parts[-1].set_fill(color)
            name.move_to(LEFT * 3.9 + UP * y)
            name.set_x(-6.6 + name.get_width() / 2)
            sums.move_to(RIGHT * 2.2 + UP * y)
            return name, sums, parts

        fixed = row(
            R"LLaVA-1.5,\\any picture",
            (R"\frac{336}{14}", R"\times", R"\frac{336}{14}", "=", "24", R"\times", "24", "=", "576"),
            1.0,
        )
        photo = row(
            R"Qwen2-VL,\\a photo",
            (R"\frac{700}{28}", R"\times", R"\frac{1260}{28}", "=", "25", R"\times", "45", "=", "1125"),
            -1.45,
            SAGE,
        )
        line = row(
            R"Qwen2-VL,\\a line of text",
            (R"\frac{28}{28}", R"\times", R"\frac{224}{28}", "=", "1", R"\times", "8", "=", "8"),
            -3.15,
            SAGE,
        )
        divider = Line(LEFT * 6.6, RIGHT * 6.6, stroke_color=RULE, stroke_width=2).move_to(UP * -0.1)

        for name, sums, parts in (fixed, photo, line):
            self.play(FadeIn(name, shift=0.15 * RIGHT), run_time=0.6)
            self.play(
                LaggedStart(
                    TransformFromCopy(rp[2], parts[0]),
                    FadeIn(parts[1]),
                    TransformFromCopy(rp[4], parts[2]),
                    lag_ratio=0.3,
                ),
                run_time=1.2,
            )
            self.play(FadeIn(parts[3:7], shift=0.15 * LEFT), run_time=0.7)
            self.play(FadeIn(parts[7:], shift=0.15 * LEFT), run_time=0.7)
            if sums is fixed[1]:
                self.wait(0.4)
                self.play(ShowCreation(divider), run_time=0.6)
                merge = words(R"merge $2\times2$ squares of 14: $p = 28$", font_size=34, color=FADED)
                merge.next_to(divider, DOWN, buff=0.12).set_x(2.2)
                self.play(FadeIn(merge, shift=0.1 * DOWN))
            self.wait(0.3)

        self.play(Indicate(fixed[2][-1], color=INK, scale_factor=1.15))
        self.wait(3)
