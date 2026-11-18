"""Clips for /learnings/vision-transformer."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class PatchTokens(Clip):
    """How a 224 by 224 colour picture becomes the encoder's input. The
    patches across times the patches down: (224/16)^2 = 196. Each patch,
    unrolled, is 16 x 16 x 3 = 768 numbers; one shared matrix E turns each
    into a token. Then the line the encoder reads, built a piece at a time:
    the class token, the 196 projected patches, plus a position vector for
    each of the 197 places."""

    def construct(self):
        title = words(R"a $224 \times 224$ picture, three colours", font_size=40, color=FADED).to_edge(UP, buff=0.7)
        self.play(FadeIn(title, shift=0.2 * DOWN), run_time=0.8)

        # How many patches
        count, cp = split_formula(
            "N", "=", R"\left(\tfrac{224}{16}\right)^{2}", "=", R"14^{2}", "=", "196",
            font_size=60,
        )
        count.move_to(UP * 1.5)
        self.play(Write(cp[:3]), run_time=1.2)
        self.play(FadeIn(cp[3:5], shift=0.15 * LEFT), run_time=0.7)
        self.play(FadeIn(cp[5:], shift=0.15 * LEFT), run_time=0.7)
        patches = words("patches", font_size=36, color=FADED).next_to(count, RIGHT, buff=0.3)
        self.play(FadeIn(patches))
        self.wait(0.8)

        # What one patch holds, and the one matrix every patch goes through
        size, sp = split_formula(
            R"16 \cdot 16 \cdot 3", "=", "768", R"\mskip\thickmuskip\longrightarrow\mskip\thickmuskip", "D",
            font_size=60,
        )
        size.next_to(count, DOWN, buff=0.7)
        each = words("numbers in each patch", font_size=36, color=FADED).next_to(size, DOWN, buff=0.25)
        self.play(Write(sp[:3]), FadeIn(each, shift=0.15 * UP), run_time=1.2)
        self.wait(0.6)
        shared = words("one matrix $E$ for every patch", font_size=36, color=SAGE).move_to(each)
        e = formula("E", font_size=44, color=SAGE).next_to(sp[3], UP, buff=0.08)
        self.play(FadeIn(sp[3:]), FadeIn(e, shift=0.1 * DOWN), FadeTransform(each, shared), run_time=1.1)
        self.wait(1.2)

        # The line the encoder reads
        line, lp = split_formula(
            "z_0", "=", R"\big[", R"x_{\mathrm{class}}", R";\mskip\medmuskip", R"x_p^{1}E", R";\mskip\medmuskip", R"x_p^{2}E", R";\mskip\medmuskip", R"\cdots", R";\mskip\medmuskip",
            R"x_p^{196}E", R"\big]", "+", R"E_{\mathrm{pos}}",
            font_size=56,
        )
        line.move_to(DOWN * 1.5)
        self.play(Write(lp[:3]), run_time=0.8)
        self.play(FadeIn(lp[3], shift=0.15 * DOWN), lp[3].animate.set_fill(SAGE), run_time=0.8)
        self.play(
            LaggedStart(*(FadeIn(p, shift=0.15 * LEFT) for p in lp[4:13]), lag_ratio=0.15),
            run_time=1.8,
        )
        self.play(FadeIn(lp[13:], shift=0.15 * LEFT), run_time=0.8)
        self.wait(0.6)

        # What it adds up to
        tally = words(R"$196 + 1 = 197$ tokens, $D$ numbers each", font_size=40, color=INK)
        brace = Brace(VGroup(*lp[3:12]), DOWN, buff=0.12).set_fill(SAGE)
        tally.next_to(brace, DOWN, buff=0.2)
        self.play(GrowFromCenter(brace), FadeIn(tally, shift=0.2 * UP), run_time=1.0)
        self.play(Indicate(lp[3], color=SAGE, scale_factor=1.15), run_time=1.0)
        self.wait(3)
