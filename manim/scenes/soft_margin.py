"""Clips for /learnings/soft-margin."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words

SCORE = R"y_i f(x_i)"
# A relation or a comma set apart in a piece of its own loses its spacing
GE = R"\mskip\thickmuskip\ge\mskip\thickmuskip"
COMMA = R",\,"
SUM = R"\sum_i\,"


class SlackToHinge(Clip):
    """Each point may fall short of its curb by a slack xi. The two rules on
    xi become one lower bound, max(0, 1 - y f(x)); paying C for each unit,
    the cheapest slack is the bound itself. Put it into the objective and
    the constraints are gone: half the squared norm of w plus C times the
    hinge losses."""

    def construct(self):
        said = words("each point may fall short of its edge by a slack $\\xi_i \\ge 0$", font_size=36, color=FADED)
        said.move_to(2.2 * UP)
        rule, rp = split_formula(SCORE, GE, "1", "-", R"\xi_i", font_size=60, t2c={R"\xi_i": SAGE})
        rule.move_to(0.9 * UP)
        self.play(FadeIn(said, shift=0.2 * DOWN), run_time=1)
        self.play(Write(rule), run_time=1.6)
        self.wait(0.8)

        # Turn it round: the slack is at least 1 - y f(x), and at least 0
        bound, bp = split_formula(R"\xi_i", GE, "1", "-", SCORE, font_size=60, t2c={R"\xi_i": SAGE})
        bound.move_to(rule)
        self.play(
            ReplacementTransform(rp[4], bp[0]),
            ReplacementTransform(rp[1], bp[1]),
            ReplacementTransform(rp[2], bp[2]),
            ReplacementTransform(rp[3], bp[3]),
            ReplacementTransform(rp[0], bp[4]),
            run_time=1.4,
        )
        self.wait(0.4)
        both, mp = split_formula(
            R"\xi_i", GE, R"\max\big(", "0", COMMA, "1", "-", SCORE, R"\big)",
            font_size=60,
            t2c={R"\xi_i": SAGE},
        )
        both.move_to(bound)
        self.play(
            ReplacementTransform(bp[0], mp[0]),
            ReplacementTransform(bp[1], mp[1]),
            ReplacementTransform(bp[2], mp[5]),
            ReplacementTransform(bp[3], mp[6]),
            ReplacementTransform(bp[4], mp[7]),
            FadeIn(mp[2:5]),
            FadeIn(mp[8]),
            run_time=1.4,
        )
        self.wait(0.6)

        # Every unit costs C, so the least slack allowed is the one paid
        cheap = words("each unit costs $C$, so pay the least allowed", font_size=36, color=FADED)
        cheap.move_to(said)
        equal, ep = split_formula(
            R"\xi_i", "=", R"\max\big(", "0", COMMA, "1", "-", SCORE, R"\big)",
            font_size=60,
            t2c={R"\xi_i": SAGE},
        )
        equal.move_to(both)
        self.play(FadeTransform(said, cheap), run_time=0.8)
        self.play(ReplacementTransform(mp, ep), run_time=1)
        self.wait(1)

        # Into the objective: the constraints disappear
        objective, op = split_formula(
            R"\min_{w,\,b}", R"\tfrac12\|w\|^2", "+", "C", SUM, R"\xi_i",
            font_size=60,
            t2c={R"\xi_i": SAGE},
        )
        objective.next_to(equal, DOWN, buff=1.0)
        self.play(FadeIn(objective, shift=0.2 * UP), run_time=1.2)
        self.wait(0.8)
        final, fp = split_formula(
            R"\min_{w,\,b}", R"\tfrac12\|w\|^2", "+", "C", SUM, R"\max\big(", "0", COMMA, "1", "-", SCORE, R"\big)",
            font_size=56,
        )
        final.move_to(ORIGIN + 0.4 * UP)
        self.play(
            FadeOut(cheap),
            ReplacementTransform(op[0:5], fp[0:5]),
            FadeOut(op[5]),
            ReplacementTransform(ep[2:], fp[5:]),
            FadeOut(ep[0:2]),
            run_time=1.8,
        )
        fp[5:].set_fill(SAGE)
        self.wait(0.4)

        # What each half asks for
        wide = Brace(fp[1], DOWN, buff=0.15).set_fill(INK)
        wide_says = words(R"a wide street", font_size=36).next_to(wide, DOWN, buff=0.2)
        loss = Brace(fp[5:], DOWN, buff=0.15).set_fill(SAGE)
        loss_says = words(R"the hinge loss", font_size=36, color=SAGE).next_to(loss, DOWN, buff=0.2)
        rate = words(R"$C$: how dear each unit of slack is", font_size=34, color=FADED)
        rate.next_to(final, UP, buff=0.8)
        self.play(GrowFromCenter(wide), FadeIn(wide_says, shift=0.2 * DOWN))
        self.play(GrowFromCenter(loss), FadeIn(loss_says, shift=0.2 * DOWN))
        self.play(FadeIn(rate, shift=0.2 * DOWN), Indicate(fp[3], color=INK, scale_factor=1.3))
        self.wait(3)
