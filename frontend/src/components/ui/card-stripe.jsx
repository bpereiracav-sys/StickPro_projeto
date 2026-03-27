import * as React from "react"
import { cn } from "../../lib/utils"

const CardWithStripe = React.forwardRef(({ className, stripeColor = "primary", children, ...props }, ref) => {
  const stripeColorClasses = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    destructive: "bg-destructive",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200",
        className
      )}
      {...props}
    >
      <div className={cn("h-1", stripeColorClasses[stripeColor] || "bg-primary")} />
      {children}
    </div>
  )
})
CardWithStripe.displayName = "CardWithStripe"

const CardStripeHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-5 pb-2 sm:pb-3", className)}
    {...props}
  />
))
CardStripeHeader.displayName = "CardStripeHeader"

const CardStripeTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-heading text-base sm:text-lg tracking-tight leading-none",
      className
    )}
    {...props}
  />
))
CardStripeTitle.displayName = "CardStripeTitle"

const CardStripeContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 sm:p-5 pt-2 sm:pt-3", className)} {...props} />
))
CardStripeContent.displayName = "CardStripeContent"

export { CardWithStripe, CardStripeHeader, CardStripeTitle, CardStripeContent }
