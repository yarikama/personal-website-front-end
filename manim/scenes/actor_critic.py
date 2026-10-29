"""Clips for /learnings/actor-critic."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words

# The maths font loses \; : a thick space spelled out
GAP = R"\mskip\thickmuskip "
LOGPI = R"\nabla \log \pi(A_t|S_t)"


class ReturnToTdError(Clip):
    """REINFORCE's push, alpha (G - b) grad log pi, with the return replaced
    by the reward plus the critic's guess one step on, and the baseline by
    the critic's guess here: the TD error. Then the two updates it drives,
    and the number at the top of the hill."""

    def construct(self):
        title = words("REINFORCE's push, after the walk", font_size=38, color=FADED).move_to(1.6 * UP)
        push, pp = split_formula(
            R"\alpha", "(", "G_t", "-", "b", ")", LOGPI,
            font_size=64,
        )
        push.next_to(title, DOWN, buff=0.8)
        self.play(FadeIn(title, shift=0.2 * DOWN), Write(push), run_time=2)
        rest = words("the rest of the walk, luck and all", font_size=36, color=FADED)
        rest.next_to(pp[2], DOWN, buff=0.6)
        arrow = Arrow(rest.get_top(), pp[2].get_bottom(), buff=0.12, stroke_color=FADED, stroke_width=3)
        self.play(FadeIn(rest, shift=0.2 * UP), GrowArrow(arrow))
        self.wait(1.4)

        # The critic's guesses take the place of both
        td, tp = split_formula(
            R"\alpha", "(", R"R_{t+1} + \gamma V(S_{t+1})", "-", "V(S_t)", ")", LOGPI,
            font_size=64,
        )
        td.move_to(push)
        for i in (2, 4):
            tp[i].set_fill(SAGE)
        new_title = words("with a critic, after every step", font_size=38, color=FADED).move_to(title)
        one_step = words("what this step paid, and the critic's guess of the rest", font_size=36, color=SAGE)
        one_step.next_to(td, DOWN, buff=0.6)
        self.play(FadeOut(VGroup(rest, arrow)))
        self.play(
            FadeTransform(title, new_title),
            *(FadeTransform(pp[i], tp[i]) for i in range(len(pp))),
            run_time=2,
        )
        self.play(FadeIn(one_step, shift=0.2 * UP))
        self.wait(1.6)

        # The bracket is the TD error
        delta = formula(
            R"\delta_t = R_{t+1} + \gamma V(S_{t+1}) - V(S_t)",
            font_size=64,
            t2c={R"\delta_t": SAGE},
        )
        self.play(new_title.animate.to_edge(UP, buff=0.6), VGroup(td, one_step).animate.shift(UP * (3.4 - 1.6)), run_time=0.8)
        delta.next_to(new_title, DOWN, buff=0.5)
        name = words("the TD error: better or worse than expected", font_size=36, color=SAGE)
        name.next_to(delta, DOWN, buff=0.35)
        self.play(FadeOut(one_step), FadeTransform(VGroup(tp[2:5]).copy(), delta), FadeOut(td), run_time=1.8)
        self.play(FadeIn(name, shift=0.2 * UP))
        self.wait(1.0)

        # It drives both halves
        actor = formula(
            R"\text{actor:}" + GAP + R"\theta" + GAP + R"\leftarrow" + GAP + R"\theta + \alpha\, \delta_t\, " + LOGPI,
            font_size=56,
        )
        critic = formula(
            R"\text{critic:}" + GAP + R"V(S_t)" + GAP + R"\leftarrow" + GAP + R"V(S_t) + \beta\, \delta_t",
            font_size=56,
        )
        halves = VGroup(actor, critic).arrange(DOWN, buff=0.45, aligned_edge=LEFT)
        halves.next_to(name, DOWN, buff=0.5)
        self.play(FadeIn(actor, shift=0.2 * DOWN), run_time=1.2)
        self.play(FadeIn(critic, shift=0.2 * DOWN), run_time=1.2)
        self.wait(1.4)

        # At the top of the hill, turning left
        worked = formula(R"\delta = 0 + 3.75 - 4.56 = -0.81", font_size=56, color=SAGE)
        worked.next_to(halves, DOWN, buff=0.6)
        note = words(R"left at the top, $\gamma = 1$: judged before lunch", font_size=36, color=FADED)
        note.next_to(worked, DOWN, buff=0.35)
        self.play(Write(worked), run_time=1.6)
        self.play(FadeIn(note))
        self.play(VGroup(new_title, delta, name, halves, worked, note).animate.center(), run_time=1)
        self.wait(3)
