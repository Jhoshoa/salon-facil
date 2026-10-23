import { OwnerInviteContactDto } from './create-owner-invite.dto';

/** Body for attaching a real owner to a venue that already exists (e.g. one an admin created
 * directly, outside the phone-onboarding form) and sending them the claim invite in one step.
 * Same required fields as OwnerInviteContactDto: email alone isn't enough to create a brand new
 * placeholder owner if no account with that email exists yet (phone and fullName are required,
 * unique columns on User). */
export class AssignVenueOwnerDto extends OwnerInviteContactDto {}
