"""Clips for /learnings/regret."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class GapTimesPulls(Clip):
    """Regret, from its definition to gap times pulls: T times the best mean
    less what you expect to collect, regrouped into one term per worse arm.
    Then the cart's three years, and what regret over T says about the
    average day."""

    def construct(self):
        title = words("regret: what not knowing cost you", font_size=40, color=FADED)
        title.to_edge(UP, buff=0.45)
        self.play(FadeIn(title, shift=0.2 * DOWN))

        defined, dp = split_formula(
            "L_T", "=", R"T\mu^*", "-", R"\mathbb{E}\Big[\sum_{t=1}^{T} r_t\Big]",
            font_size=60,
        )
        defined.next_to(title, DOWN, buff=0.6)
        always = words("always the best", font_size=32, color=FADED).next_to(dp[2], DOWN, buff=0.25)
        got = words("what you collect", font_size=32, color=FADED).next_to(dp[4], DOWN, buff=0.25)
        self.play(Write(defined), run_time=2)
        self.play(FadeIn(always), FadeIn(got))
        self.wait(1)

        # One term per arm: each pull of a costs the gap, on average
        grouped, gp = split_formula(
            "L_T", "=", R"\sum_{a}", R"\Delta_a", R"\,\mathbb{E}[N_a(T)]",
            font_size=60,
            t2c={R"\Delta_a": SAGE},
        )
        grouped.move_to(defined)
        self.play(
            FadeOut(VGroup(always, got)),
            FadeTransform(dp[0], gp[0]),
            FadeTransform(dp[1], gp[1]),
            FadeTransform(dp[2:], gp[2:]),
            run_time=1.8,
        )
        gap = VGroup(formula(R"\Delta_a = \mu^* - \mu_a", font_size=38, color=SAGE), words("the gap", font_size=32, color=SAGE))
        gap.arrange(RIGHT, buff=0.2).next_to(grouped, DOWN, buff=0.3).match_x(gp[3])
        pulls = words("pulls of $a$", font_size=32, color=FADED).next_to(grouped, DOWN, buff=0.3).match_x(gp[4])
        gap.shift(0.8 * LEFT)
        pulls.shift(0.5 * RIGHT)
        self.play(FadeIn(gap, shift=0.1 * UP), FadeIn(pulls, shift=0.1 * UP))
        self.wait(1.2)

        # The cart: the Station's gap is 60, the Market's 180
        cart, cp = split_formula("60", R"\times", "33", "+", "180", R"\times", "42", "=", R"\$9{,}540", font_size=56, t2c={R"\$9{,}540": SAGE})
        cart.next_to(VGroup(gap, pulls), DOWN, buff=0.55)
        label = words("your three years", font_size=32, color=FADED).next_to(cart, LEFT, buff=0.4)
        self.play(FadeIn(label), TransformFromCopy(gp[3], cp[0]), TransformFromCopy(gp[4], cp[2]), run_time=1.2)
        self.play(TransformFromCopy(gp[3], cp[4]), TransformFromCopy(gp[4], cp[6]), FadeIn(cp[1]), FadeIn(cp[3]), FadeIn(cp[5]), run_time=1.2)
        self.play(FadeIn(cp[7:], shift=0.2 * LEFT))
        self.wait(1.2)

        # Divided by T: how far the average day falls short of the best
        average, ap = split_formula(R"\text{average reward}", "=", R"\mu^*", "-", R"\frac{L_T}{T}", font_size=56, t2c={R"\frac{L_T}{T}": SAGE})
        average.next_to(cart, DOWN, buff=0.6)
        self.play(Write(average), run_time=1.6)
        linear = words(R"$L_T$ grows like $T$: stuck below $\mu^*$", font_size=34, color=INK)
        sub = words(R"$L_T$ grows slower than $T$: closes in on $\mu^*$", font_size=34, color=SAGE)
        VGroup(linear, sub).arrange(DOWN, buff=0.25).next_to(average, DOWN, buff=0.45)
        self.play(FadeIn(linear, shift=0.15 * UP))
        self.play(FadeIn(sub, shift=0.15 * UP))
        self.wait(4)
