from app import app, db, User

with app.app_context():
    users = User.query.all()
    if not users:
        print("❌ No users found. Sign up on the website first, then run this again.")
    else:
        print("\n📋 Existing users:")
        for u in users:
            admin_status = "👑 ADMIN" if u.is_admin else "user"
            print(f"  ID {u.id}: {u.username} [{admin_status}]")

        print("\n" + "="*50)
        email = input("Enter the email you want to make ADMIN: ").strip()

        user = User.query.filter_by(username=email).first()
        if not user:
            print(f"❌ No user found with email: {email}")
        else:
            user.is_admin = True
            db.session.commit()
            print(f"\n✅ SUCCESS! {email} is now an ADMIN.")
            print("Now log out and log in again for the change to take effect.")