"""Clips for /learnings/importance-sampling."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class RatioCancels(Clip):
    """The chance of one trip if you drive it, over its chance if your
    friend drives it: a move's chance, then the road's, again and again. The
    road's chances are the same in both, so they cancel, and what is left is
    the product of your chance over your friend's, move by move. Then the
    story's first trip, in numbers."""

    def construct(self):
        title = words("how likely is this trip?", font_size=36, color=FADED).to_edge(UP, buff=0.5)

        top, tp = split_formula(
            R"\pi(A_0|S_0)", R"\,p(S_1|S_0,A_0)", R"\,\pi(A_1|S_1)", R"\,p(S_2|S_1,A_1)", R"\,\cdots",
            font_size=52,
            t2c={R"\pi": SAGE},
        )
        bottom, bp = split_formula(
            R"b(A_0|S_0)", R"\,p(S_1|S_0,A_0)", R"\,b(A_1|S_1)", R"\,p(S_2|S_1,A_1)", R"\,\cdots",
            font_size=52,
        )
        top.move_to(UP * 1.75 + RIGHT * 0.55)
        bottom.move_to(UP * 0.05 + RIGHT * 0.55)
        # Line the friend's pieces up under yours
        for upper, lower in zip(tp, bp):
            lower.set_x(upper.get_x())
        bar = Line(LEFT, RIGHT, stroke_color=INK, stroke_width=2.5).set_width(top.get_width() + 0.3).move_to(UP * 0.9).set_x(top.get_x())
        rho = formula(R"\rho =", font_size=56).next_to(bar, LEFT, buff=0.25)
        you = words("if you drive", font_size=34, color=FADED).next_to(top, UP, buff=0.35)
        friend = words("if your friend drives", font_size=34, color=FADED).next_to(bottom, DOWN, buff=0.35)

        self.play(FadeIn(title))
        self.play(FadeIn(you), LaggedStart(*(FadeIn(p, shift=0.1 * DOWN) for p in tp), lag_ratio=0.35), run_time=2.4)
        moves = words("your move", font_size=34, color=SAGE).next_to(tp[0], DOWN, buff=0.25)
        road = words("the road", font_size=34, color=FADED).next_to(tp[1], DOWN, buff=0.25)
        self.play(FadeIn(moves), FadeIn(road))
        self.wait(1.2)
        self.play(FadeOut(moves), FadeOut(road))
        self.play(
            ShowCreation(bar),
            FadeIn(rho),
            FadeIn(friend),
            LaggedStart(*(FadeIn(p, shift=0.1 * UP) for p in bp), lag_ratio=0.35),
            run_time=2.4,
        )
        self.wait(0.8)

        # The road's chances are the same whoever drives: strike them out
        same = words("the road's chances: the same for both", font_size=36, color=FADED).move_to(title)
        self.play(FadeTransform(title, same))
        roads = [tp[1], tp[3], bp[1], bp[3]]
        boxes = VGroup(*(SurroundingRectangle(r, buff=0.08, stroke_color=FADED, stroke_width=2) for r in roads))
        self.play(ShowCreation(boxes), run_time=1)
        strikes = VGroup(
            *(Line(r.get_corner(DL), r.get_corner(UR), stroke_color=SAGE, stroke_width=4) for r in roads)
        )
        self.play(ShowCreation(strikes), run_time=1)
        self.wait(0.6)

        # What is left: your chance over your friend's, move by move
        ratio = formula(
            R"\rho = \prod_{t} \frac{\pi(A_t|S_t)}{b(A_t|S_t)}",
            font_size=64,
            t2c={R"\pi": SAGE},
        ).move_to(UP * 1.0)
        left = VGroup(rho, bar, tp[0], tp[2], tp[4], bp[0], bp[2], bp[4])
        cancelled = VGroup(*roads, boxes, strikes, you, friend)
        no_model = words("no model of the roads needed", font_size=36, color=SAGE).move_to(same)
        self.play(FadeOut(cancelled), run_time=0.8)
        self.play(FadeTransform(left, ratio), FadeTransform(same, no_model), run_time=1.6)
        self.wait(1.2)

        # The story's first trip
        trip = words("trip 1: main, main, side", font_size=36, color=FADED).move_to(DOWN * 0.9)
        sums, sp = split_formula(
            R"\tfrac{0.8}{0.5}", R"\times", R"\tfrac{0.8}{0.5}", R"\times", R"\tfrac{0.2}{0.5}",
            "=", "1.6", R"\times", "1.6", R"\times", "0.4", R"\mskip\thickmuskip\approx\mskip\thickmuskip", "1.02",
            font_size=56,
            t2c={"1.02": SAGE},
        )
        sums.move_to(DOWN * 2.2)
        self.play(FadeIn(trip, shift=0.1 * UP))
        self.play(LaggedStart(*(FadeIn(p) for p in sp[:5]), lag_ratio=0.25), run_time=1.6)
        self.play(LaggedStart(*(FadeIn(p) for p in sp[5:11]), lag_ratio=0.15), run_time=1.4)
        self.play(FadeIn(sp[11:], shift=0.2 * LEFT))
        self.play(Indicate(sp[12], color=INK, scale_factor=1.15))
        self.wait(2.5)
