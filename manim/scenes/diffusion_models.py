"""Clips for /learnings/diffusion-models."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class ClosedForm(Clip):
    """One step of noising, and the step before it substituted in: two noise
    draws, whose variances add, merge into one. Repeated, any number of steps
    is a single jump from the start, with the story's numbers dropped in."""

    def construct(self):
        title = words("one step of noise", font_size=42, color=FADED).move_to(2.4 * UP)
        step, parts = split_formula(
            "x_t", "=", R"\sqrt{1-\beta}\, x_{t-1}", "+", R"\sqrt{\beta}\, \epsilon_t",
            font_size=70,
        )
        parts[4].set_fill(SAGE)
        step.next_to(title, DOWN, buff=0.7)
        says = words("shrink a touch, add a small noise draw", font_size=38, color=FADED)
        says.next_to(step, DOWN, buff=0.35)
        self.play(FadeIn(title, shift=0.2 * DOWN), Write(step), run_time=1.6)
        self.play(FadeIn(says))
        self.wait(1.0)

        # The step before, substituted in
        before = formula(
            R"x_{t-1} = \sqrt{1-\beta}\, x_{t-2} + \sqrt{\beta}\, \epsilon_{t-1}",
            font_size=54, color=FADED,
        )
        before.next_to(step, DOWN, buff=0.55)
        self.play(FadeOut(says), FadeIn(before, shift=0.2 * UP), run_time=0.9)
        self.wait(0.8)
        two, two_parts = split_formula(
            "x_t", "=", R"(1-\beta)\, x_{t-2}", "+", R"\sqrt{(1-\beta)\beta}\, \epsilon_{t-1}", "+", R"\sqrt{\beta}\, \epsilon_t",
            font_size=62,
        )
        two_parts[4].set_fill(SAGE)
        two_parts[6].set_fill(SAGE)
        two.move_to(step)
        self.play(
            FadeOut(before),
            FadeTransform(parts[0], two_parts[0]),
            FadeTransform(parts[1], two_parts[1]),
            FadeTransform(parts[2], two_parts[2]),
            FadeTransform(parts[3], two_parts[3]),
            FadeIn(two_parts[4]),
            FadeIn(two_parts[5]),
            FadeTransform(parts[4], two_parts[6]),
            run_time=1.4,
        )
        self.play(Transform(title, words("two steps: two noise draws", font_size=42, color=FADED).move_to(title)))
        self.wait(0.8)

        # Two independent draws add up to one, with their variances added
        added = formula(R"(1-\beta)\beta + \beta = 1 - (1-\beta)^2", font_size=58, color=SAGE)
        added.next_to(two, DOWN, buff=0.6)
        added_says = words("their variances add", font_size=38, color=FADED)
        added_says.next_to(added, DOWN, buff=0.3)
        self.play(Write(added), FadeIn(added_says), run_time=1.4)
        self.wait(1.0)
        merged, merged_parts = split_formula(
            "x_t", "=", R"(1-\beta)\, x_{t-2}", "+", R"\sqrt{1-(1-\beta)^2}\, \epsilon",
            font_size=62,
        )
        merged_parts[4].set_fill(SAGE)
        merged.move_to(two)
        self.play(
            FadeTransform(VGroup(two_parts[4], two_parts[5], two_parts[6]), merged_parts[4]),
            FadeTransform(VGroup(*two_parts[:4]), VGroup(*merged_parts[:4])),
            FadeOut(added_says),
            added.animate.set_fill(FADED),
            run_time=1.3,
        )
        self.play(Transform(title, words("one draw does the work of two", font_size=42, color=FADED).move_to(title)))
        self.wait(1.0)

        # Any number of steps: the jump
        jump, jump_parts = split_formula(
            "x_t", "=", R"\sqrt{\bar\alpha_t}\, x_0", "+", R"\sqrt{1-\bar\alpha_t}\, \epsilon",
            font_size=72,
        )
        jump_parts[4].set_fill(SAGE)
        jump.move_to(merged)
        bar = formula(R"\bar\alpha_t = (1-\beta)^t", font_size=56, color=INK)
        bar.next_to(jump, DOWN, buff=0.5)
        self.play(
            FadeOut(added),
            Transform(title, words("after $t$ steps: one jump", font_size=42, color=FADED).move_to(title)),
            FadeTransform(merged, jump),
            run_time=1.4,
        )
        self.play(FadeIn(bar, shift=0.2 * UP))
        self.wait(1.2)

        # The story's numbers
        given = formula(R"\beta = 0.05,\ t = 10:\quad \bar\alpha_{10} = 0.95^{10} = 0.60", font_size=52, color=FADED)
        given.next_to(bar, DOWN, buff=0.6)
        worked = formula(R"x_{10} = 0.77\, x_0 + 0.63\, \epsilon", font_size=62, t2c={R"0.63\, \epsilon": SAGE})
        worked.next_to(given, DOWN, buff=0.45)
        self.play(FadeIn(given), run_time=0.9)
        self.play(Write(worked), run_time=1.3)
        self.play(VGroup(title, jump, bar, given, worked).animate.center(), run_time=0.8)
        self.wait(3)
