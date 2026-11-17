"""Clips for /learnings/gradient-descent."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class ShrinkOrGrow(Clip):
    """The step in words, then in symbols on a bowl whose slope is L times w,
    gathered into one factor, 1 - eta L, that multiplies the distance every
    step. Then the story's three step sizes as points on a line: inside the
    band from -1 to 1 the walk closes in, outside it climbs out."""

    def construct(self):
        said, sp = split_words("new", "$=$", "old", "$-$", "step", R"$\times$", "slope", font_size=44)
        rule, rp = split_formula(
            "w_{t+1}", "=", "w_t", "-", R"\eta", R"\times", "L\,w_t",
            font_size=68,
            t2c={R"\eta": FADED},
        )
        said.to_edge(UP, buff=0.9)
        rule.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=2)
        self.wait(0.6)
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(7)), lag_ratio=0.12),
            run_time=2.2,
        )

        # On a bowl the slope at w is L times w
        brace = Brace(rp[6], DOWN, buff=0.15).set_fill(FADED)
        slope = words("the slope on a bowl", font_size=34, color=FADED).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(slope, shift=0.2 * DOWN))
        self.wait(1.2)

        # Gather the two w_t: one factor
        gathered, gp = split_formula(
            "w_{t+1}", "=", R"(1 - \eta L)", "w_t",
            font_size=68,
            t2c={R"(1 - \eta L)": SAGE},
        )
        gathered.to_edge(UP, buff=0.9)
        self.play(FadeOut(said), FadeOut(brace), FadeOut(slope), rule.animate.to_edge(UP, buff=0.9), run_time=0.8)
        gathered.move_to(rule)
        self.play(
            ReplacementTransform(rp[0:2], gp[0:2]),
            ReplacementTransform(rp[2], gp[3]),
            ReplacementTransform(rp[3:6], gp[2]),
            ReplacementTransform(rp[6], gp[2].copy()),
            run_time=1.8,
        )
        self.add(gathered)
        factor_brace = Brace(gp[2], DOWN, buff=0.15).set_fill(SAGE)
        factor = words("every step, the distance times this", font_size=34, color=SAGE)
        factor.next_to(factor_brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(factor_brace), FadeIn(factor, shift=0.2 * DOWN))
        self.wait(1.4)
        self.play(FadeOut(factor_brace), FadeOut(factor), run_time=0.6)

        # The factor's values on a line, and the band where the walk closes in
        line = NumberLine(x_range=[-1.5, 1.5, 0.5], width=11, color=RULE, tick_size=0.06, stroke_width=3)
        line.move_to(DOWN * 1.0)
        ticks = VGroup(
            *(
                formula(text, font_size=42, color=FADED).next_to(line.n2p(value), DOWN, buff=0.3)
                for value, text in ((-1, "-1"), (0, "0"), (1, "1"))
            )
        )
        band = Rectangle(
            width=line.n2p(1)[0] - line.n2p(-1)[0],
            height=0.5,
            stroke_width=0,
            fill_color=SAGE,
            fill_opacity=0.22,
        ).move_to(line.n2p(0))
        closes = words("closes in", font_size=34, color=SAGE).next_to(band, UP, buff=0.2)
        self.play(ShowCreation(line), FadeIn(ticks), FadeIn(band), FadeIn(closes), run_time=1.2)

        # The story's steps, on w squared, where L is 2
        cases = [
            (0.2, 0.8, SAGE, UP),
            (1.8, -0.8, SAGE, UP),
            (2.2, -1.2, INK, DOWN),
        ]
        for product, value, colour, side in cases:
            dot = Dot(line.n2p(value), radius=0.13, fill_color=colour)
            label = formula(Rf"\eta L = {product}", font_size=44, color=colour)
            if side is DOWN:
                label = VGroup(label, words("climbs out", font_size=36, color=colour)).arrange(RIGHT, buff=0.35)
            if side is UP:
                label.next_to(dot, UP, buff=0.75)
            else:
                label.next_to(dot, DOWN, buff=1.0).align_to(dot, LEFT).shift(0.3 * LEFT)
            self.play(
                TransformFromCopy(gp[2], dot),
                FadeIn(label, shift=0.2 * side),
                run_time=1.2,
            )
            self.wait(0.5)

        # When it settles
        rule_out, rop = split_formula(
            R"\lvert 1 - \eta L \rvert < 1", R"\quad\Leftrightarrow\quad", R"0 < \eta < 2/L",
            font_size=56,
            t2c={R"2/L": SAGE},
        )
        rule_out.next_to(gathered, DOWN, buff=0.75)
        self.play(FadeIn(rop[0], shift=0.2 * DOWN), run_time=0.8)
        self.play(FadeIn(rop[1:], shift=0.2 * LEFT), run_time=1.0)
        self.play(Indicate(rop[2], color=SAGE, scale_factor=1.1))
        self.wait(3)
