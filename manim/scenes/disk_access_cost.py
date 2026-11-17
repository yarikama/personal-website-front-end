"""Clips for /learnings/disk-access-cost."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, split_words, words


class AccessTime(Clip):
    """The cost of one read in words, then in symbols, then in milliseconds;
    then the same terms for 1,000 pages, scattered and in one run, where the
    1,000 multiplies the trip in one and only the reading in the other."""

    def construct(self):
        said, sp = split_words(
            "time", "=", "move the arm", "+", "wait for the spin", "+", "read",
            font_size=44,
        )
        rule, rp = split_formula(
            "T", "=", R"T_{\mathrm{seek}}", "+", R"T_{\mathrm{rot}}", "+", R"T_{\mathrm{transfer}}",
            font_size=66,
        )
        said.to_edge(UP, buff=1.0)
        rule.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=2.2)
        self.wait(0.6)
        # Each phrase becomes its symbol
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(7)), lag_ratio=0.12),
            run_time=2.2,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.8), run_time=0.8)

        # One 4 KB page on the course's disk: each number under its symbol
        one, op = split_formula(
            R"6.04", "=", "3", "+", "3", "+", "0.04",
            font_size=66,
        )
        unit = formula(R"\mathrm{ms}", font_size=52, color=FADED)
        one.next_to(rule, DOWN, buff=0.9)
        unit.next_to(one, RIGHT, buff=0.3)
        self.play(
            LaggedStart(
                *(TransformFromCopy(rp[i], op[i]) for i in range(7)),
                lag_ratio=0.15,
            ),
            FadeIn(unit),
            run_time=2.4,
        )

        there = Brace(op[2:5], DOWN, buff=0.15).set_fill(SAGE)
        # Each label hangs away from the other: one ends under its brace's
        # right end, the other starts under its brace's left
        there_says = words("getting there: 6 ms", font_size=38, color=SAGE).next_to(there, DOWN, buff=0.2)
        there_says.align_to(there, RIGHT)
        reading = Brace(op[6], DOWN, buff=0.15).set_fill(FADED)
        reading_says = words("reading: 0.04 ms", font_size=38, color=FADED).next_to(reading, DOWN, buff=0.2)
        reading_says.align_to(reading, LEFT).align_to(there_says, UP)
        self.play(GrowFromCenter(there), FadeIn(there_says, shift=0.2 * DOWN))
        self.play(GrowFromCenter(reading), FadeIn(reading_says, shift=0.2 * DOWN))
        self.wait(1.4)

        # 1,000 pages: where the 1,000 goes
        scattered, cp = split_formula(
            "1000", R"\times", "(", "6", "+", "0.04", ")", "=", R"6040\,\mathrm{ms}",
            font_size=60,
        )
        run, rn = split_formula(
            "6", "+", "1000", R"\times", "0.04", "=", R"46\,\mathrm{ms}",
            font_size=60,
        )
        scattered_name = words("scattered", font_size=40, color=FADED)
        run_name = words("in one run", font_size=40, color=FADED)
        scattered.move_to(UP * 0.3 + RIGHT * 1.3)
        run.next_to(scattered, DOWN, buff=1.0).align_to(scattered, LEFT)
        scattered_name.next_to(scattered, LEFT, buff=0.6)
        run_name.next_to(run, LEFT, buff=0.6).align_to(scattered_name, RIGHT)
        for name, line in ((scattered_name, scattered), (run_name, run)):
            name.match_y(line)
        cp[3].set_fill(SAGE)
        rn[0].set_fill(SAGE)

        self.play(
            FadeOut(VGroup(one, unit, there, there_says, reading, reading_says)),
            run_time=0.8,
        )
        self.play(FadeIn(scattered_name), FadeIn(cp[:8]), run_time=1.2)
        self.play(FadeIn(cp[8], shift=0.2 * LEFT))
        self.wait(0.6)
        self.play(FadeIn(run_name), FadeIn(rn[:6]), run_time=1.2)
        self.play(FadeIn(rn[6], shift=0.2 * LEFT))
        self.wait(0.4)

        # The trip: under the 1,000 in one line, outside it in the other
        self.play(
            Indicate(cp[3], color=SAGE, scale_factor=1.35),
            Indicate(rn[0], color=SAGE, scale_factor=1.35),
            run_time=1.4,
        )
        ratio = words(R"same bytes, about 130$\times$ slower", font_size=42).to_edge(DOWN, buff=0.8)
        self.play(FadeIn(ratio, shift=0.2 * UP))
        self.wait(3)
