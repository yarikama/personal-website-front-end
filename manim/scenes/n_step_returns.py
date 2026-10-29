"""Clips for /learnings/n-step-returns."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class NStepReturn(Clip):
    """The return written a term at a time, to the end of the episode. A cut
    after three rewards: everything past it turns into one guess. Then the
    two ends of the dial: cut after one, TD(0); never cut, Monte Carlo."""

    def construct(self):
        title = words("everything that follows, to the end", font_size=36, color=FADED).to_edge(UP, buff=0.7)
        full, fp = split_formula(
            "G_t", "=", "R_{t+1}", "+", R"\gamma R_{t+2}", "+", R"\gamma^2 R_{t+3}", "+", R"\gamma^3 R_{t+4}", "+", R"\cdots",
            font_size=56,
        )
        full.move_to(UP * 1.4)

        self.play(FadeIn(title))
        self.play(FadeIn(fp[0:2]))
        # The rewards arrive one at a time
        for i in range(2, len(fp), 2):
            self.play(FadeIn(VGroup(*fp[i : i + 2]), shift=0.2 * LEFT), run_time=0.55)
        self.wait(0.6)

        # Cut after three rewards
        cut = Line(UP * 0.6, DOWN * 0.6, stroke_color=SAGE, stroke_width=5)
        cut.move_to((fp[6].get_right() + fp[7].get_left()) / 2)
        cut.set_y(fp[6].get_center()[1])
        keep_label = words("keep $n = 3$ rewards", font_size=34, color=SAGE).next_to(VGroup(*fp[2:7]), DOWN, buff=0.5)
        self.play(ShowCreation(cut), FadeIn(keep_label))
        self.wait(0.8)

        # Everything past the cut becomes one guess
        nstep, np_ = split_formula(
            "G_{t:t+3}", "=", "R_{t+1}", "+", R"\gamma R_{t+2}", "+", R"\gamma^2 R_{t+3}", "+", R"\gamma^3 V(S_{t+3})",
            font_size=56,
            t2c={R"\gamma^3 V(S_{t+3})": SAGE},
        )
        nstep.move_to(UP * 1.4)
        self.play(FadeOut(keep_label), FadeOut(cut))
        self.play(
            FadeTransform(fp[0], np_[0]),
            *(ReplacementTransform(fp[i], np_[i]) for i in range(1, 8)),
            FadeTransform(VGroup(*fp[8:]), np_[8]),
            run_time=1.8,
        )
        brace = Brace(np_[8], DOWN, buff=0.15).set_fill(SAGE)
        guess = words("your guess for the rest", font_size=34, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(guess, shift=0.2 * DOWN))
        self.wait(1.4)

        # The two ends of the dial
        new_title = words("where you cut is the only choice", font_size=36, color=FADED).move_to(title)
        td, _ = split_formula("n = 1", R"\colon", "R_{t+1}", "+", R"\gamma V(S_{t+1})", font_size=50, t2c={R"\gamma V(S_{t+1})": SAGE})
        mc, _ = split_formula("n \\to \\text{end}", R"\colon", "R_{t+1}", "+", R"\gamma R_{t+2}", "+", R"\cdots", "+", R"\gamma^{T-t-1} R_T", font_size=50)
        td.move_to(DOWN * 1.0 + LEFT * 0.6)
        mc.move_to(DOWN * 2.4 + LEFT * 0.6)
        td_name = formula(R"\mathrm{TD}(0)", font_size=44, color=SAGE).next_to(td, RIGHT, buff=0.6)
        mc_name = words("Monte Carlo", font_size=36, color=INK).next_to(mc, RIGHT, buff=0.6)
        names = VGroup(td_name, mc_name)
        rows = VGroup(td, mc)
        group = VGroup(rows, names)
        group.set_x(0)
        if group.get_width() > FRAME_WIDTH - 1:
            group.set_width(FRAME_WIDTH - 1)
        rule = Line(LEFT * 6, RIGHT * 6, stroke_color=RULE, stroke_width=2).move_to(DOWN * 0.25)

        self.play(FadeOut(brace), FadeOut(guess), FadeTransform(title, new_title), ShowCreation(rule))
        self.play(FadeIn(td, shift=0.2 * UP), FadeIn(td_name, shift=0.2 * UP))
        self.play(FadeIn(mc, shift=0.2 * UP), FadeIn(mc_name, shift=0.2 * UP))
        self.wait(3)
