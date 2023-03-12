module.exports = class MemberRoles {
    rolesToAdd = [];
    rolesToRemove = [];
    constructor(memberRoles = []) {
        this.memberRoles = new Set(memberRoles);
        /**
         * newMemberRoles will have all the roles that the 
         * member should have regardless of if the member 
         * already has the role
         */
        this.newMemberRoles = new Set();
    }
    addRole(role, reason) {
        this.newMemberRoles.add(role);
        if (role && !this.memberRoles.has(role)) {
            // console.log(`roles: adding role, ${role}`, reason)

            this.memberRoles.add(role);

            this.rolesToAdd.push({ id: role, reason: reason ?? 'No reason specified' });
            // this.rolesToRemove = this.rolesToRemove.filter(e => e.id !== role);
        }
    }
    removeRole(role, reason) {
        /**
         * to solve duplicate role issue, check to see
         * if the newMemberRoles has the role we want to
         * remove, and if so, just don't remove it.
         */
        if (role && this.memberRoles.has(role) && !this.newMemberRoles.has(role)) {
            // console.log(`roles: removing role, ${role}`, reason)

            this.memberRoles.delete(role);

            this.rolesToRemove.push({ id: role, reason: reason ?? 'No reason specified' });
            // this.rolesToAdd = this.rolesToAdd.filter(e => e.id !== role);
        }
    }
    array() {
        return [...this.memberRoles.keys()];
    }
}